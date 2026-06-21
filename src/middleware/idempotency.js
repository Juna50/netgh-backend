/**
 * idempotency.js
 *
 * Redis-backed idempotency middleware for Express.
 *
 * How it works:
 *   1. Client sends a request with an `Idempotency-Key` header (UUID v4).
 *   2. Middleware checks Redis for a cached response under that key.
 *      - HIT  → return the cached response immediately (no handler called).
 *      - LOCK → another request with the same key is in-flight → 409.
 *      - MISS → acquire a lock, run the handler, cache the response, release lock.
 *
 * Key format in Redis:
 *   idempotency:{userId}:{key}         → cached response (JSON)
 *   idempotency:lock:{userId}:{key}    → in-flight lock (NX + TTL)
 *
 * Guarantees:
 *   - Same key + same user always returns the same response.
 *   - Concurrent duplicate requests are rejected with 409 while the first is processing.
 *   - Keys scoped per user — user A's key cannot collide with user B's.
 *   - Only 2xx responses are cached (errors are never replayed).
 *   - TTL is configurable (default 24 hours).
 */

const crypto = require('crypto');

// ─── Config defaults ──────────────────────────────────────────────────────────

const DEFAULTS = {
  ttlSeconds:      86_400,   // 24 hours
  lockTtlSeconds:  30,       // max time a request is considered "in-flight"
  headerName:      'idempotency-key',
  maxKeyLength:    128,
  cachePrefix:     'idempotency',
  lockPrefix:      'idempotency:lock',
};

// ─── Validation ───────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (key.length > DEFAULTS.maxKeyLength) return false;
  return UUID_RE.test(key);
}

// ─── Redis key builders ───────────────────────────────────────────────────────

function cacheKey(userId, key) {
  // Hash the composite to keep Redis keys a fixed, safe length
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${key}`)
    .digest('hex');
  return `${DEFAULTS.cachePrefix}:${hash}`;
}

function lockKey(userId, key) {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${key}`)
    .digest('hex');
  return `${DEFAULTS.lockPrefix}:${hash}`;
}

// ─── Cached response serialisation ───────────────────────────────────────────

function serialise(statusCode, headers, body) {
  return JSON.stringify({
    statusCode,
    // Only cache safe, non-sensitive headers
    headers: {
      'content-type': headers['content-type'] ?? 'application/json',
    },
    body,
    cachedAt: new Date().toISOString(),
  });
}

function deserialise(raw) {
  return JSON.parse(raw);
}

// ─── Response interceptor ─────────────────────────────────────────────────────
// Wraps res.json() to capture the response before it's sent,
// so we can store it in Redis.

function interceptResponse(res, onCapture) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      onCapture(res.statusCode, res.getHeaders(), body);
    }
    return originalJson(body);
  };
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * @param {object} redis   - ioredis or ioredis Cluster instance
 * @param {object} [opts]  - optional overrides
 * @param {number} [opts.ttlSeconds]
 * @param {number} [opts.lockTtlSeconds]
 * @param {boolean} [opts.requireAuth=true]  - if true, scopes keys per authenticated user
 */
function createIdempotencyMiddleware(redis, opts = {}) {
  const ttl     = opts.ttlSeconds     ?? DEFAULTS.ttlSeconds;
  const lockTtl = opts.lockTtlSeconds ?? DEFAULTS.lockTtlSeconds;
  const requireAuth = opts.requireAuth !== false; // default true

  return async function idempotency(req, res, next) {
    const rawKey = req.headers[DEFAULTS.headerName];

    // ── Key absent — reject ────────────────────────────────────────────────────
    if (!rawKey) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'MISSING_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key header is required for this endpoint.',
        },
      });
    }

    // ── Key format invalid — reject ────────────────────────────────────────────
    if (!isValidKey(rawKey)) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be a valid UUID v4.',
        },
      });
    }

    // ── Resolve the user identity for key scoping ──────────────────────────────
    // Falls back to IP if auth middleware hasn't run (not recommended for financial endpoints).
    const userId = req.user?.id ?? (requireAuth ? null : req.ip);

    if (requireAuth && !userId) {
      return res.status(401).json({
        success: false,
        error: {
          code:    'UNAUTHENTICATED',
          message: 'Authentication is required to use idempotent endpoints.',
        },
      });
    }

    const rCacheKey = cacheKey(userId, rawKey);
    const rLockKey  = lockKey(userId, rawKey);

    try {
      // ── Check cache ────────────────────────────────────────────────────────
      const cached = await redis.get(rCacheKey);

      if (cached) {
        const stored = deserialise(cached);

        // Replay the original response
        res.set('Idempotency-Replayed', 'true');
        res.set('Idempotency-Cached-At', stored.cachedAt);
        res.set('Content-Type', stored.headers['content-type']);
        return res.status(stored.statusCode).json(stored.body);
      }

      // ── Acquire in-flight lock (SET NX EX) ────────────────────────────────
      // NX = only set if key does not exist
      // This prevents two concurrent identical requests from both executing.
      const lockAcquired = await redis.set(rLockKey, '1', 'EX', lockTtl, 'NX');

      if (!lockAcquired) {
        // Another request with this key is currently being processed
        return res.status(409).json({
          success: false,
          error: {
            code:      'IDEMPOTENCY_CONFLICT',
            message:   'A request with this Idempotency-Key is already being processed. Retry after a moment.',
            retryable: true,
          },
        });
      }

      // ── Intercept the response to capture and cache it ─────────────────────
      interceptResponse(res, async (statusCode, headers, body) => {
        try {
          const payload = serialise(statusCode, headers, body);
          // Store response; release lock (delete lock key)
          await redis
            .pipeline()
            .set(rCacheKey, payload, 'EX', ttl)
            .del(rLockKey)
            .exec();
        } catch (cacheErr) {
          // Non-fatal: log but don't fail the response
          console.error({ err: cacheErr, key: rawKey }, 'idempotency: failed to cache response');
          // Attempt lock cleanup even if cache write failed
          redis.del(rLockKey).catch(() => {});
        }
      });

      // ── On response finish (covers error paths too) — release lock ─────────
      // The interceptor handles the happy path. This covers cases where
      // the handler throws, returns a non-2xx, or never calls res.json.
      res.on('finish', async () => {
        // If lock still exists (non-2xx response — not cached), release it
        // so the client can retry without waiting for TTL.
        try {
          await redis.del(rLockKey);
        } catch (_) {
          // best-effort
        }
      });

      return next();
    } catch (err) {
      // Redis unavailable — fail open with a warning header.
      // Do NOT block financial requests because of cache infrastructure failure.
      // The application-level idempotency (unique referenceId on LedgerEntry)
      // is the real safety net.
      console.error({ err }, 'idempotency: Redis error — failing open');
      res.set('Idempotency-Warning', 'cache-unavailable');
      return next();
    }
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { createIdempotencyMiddleware, isValidKey, cacheKey, lockKey };