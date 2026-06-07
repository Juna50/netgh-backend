const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors');

/**
 * Verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided. Please log in.');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select('+isActive');
  if (!user) throw new UnauthorizedError('User no longer exists.');
  if (!user.isActive) throw new UnauthorizedError('Account is suspended. Contact support.');

  req.user = user;
  next();
};

/**
 * Restrict to specific roles
 * Usage: authorize('ADMIN') or authorize('ADMIN', 'AGENT')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present, does not block if absent
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Silent — optional auth doesn't throw
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
