require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const productRoutes = require('./modules/products/products.routes');
const providerRoutes = require('./modules/providers/providers.routes');
const orderRoutes = require('./modules/orders/orders.routes');
const paymentRoutes = require('./modules/payments/payments.routes');
const checkerRoutes = require('./modules/checker-inventory/checker.routes');
const esimRoutes = require('./modules/esim/esim.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const agentRoutes = require('./modules/users/agent.routes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment requests, slow down.' },
});

app.use(globalLimiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
// Raw body needed for Paystack webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/providers`, providerRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/payments`, paymentLimiter, paymentRoutes);
app.use(`${API}/checker`, checkerRoutes);
app.use(`${API}/esim`, esimRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/agent`, agentRoutes);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // ─── Connect to DB ────────────────────────────────────────────────────────────
  connectDB();

  // ─── Start Server ──────────────────────────────────────────────────────────────
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
