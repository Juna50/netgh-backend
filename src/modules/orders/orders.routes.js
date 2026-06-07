const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize, optionalAuth } = require('../../middleware/auth');
const ordersController = require('./orders.controller');

const router = express.Router();

// ─── Public ────────────────────────────────────────────────────────────────────

// POST /api/orders  — create an order (works for guests and agents)
router.post(
  '/',
  optionalAuth,
  [
    body('productId').notEmpty().withMessage('Product ID required'),
    body('customerName').trim().notEmpty().withMessage('Name required'),
    body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('customerPhone').trim().notEmpty().withMessage('Phone required'),
    body('recipientPhone').optional().trim(),
    validate,
  ],
  ordersController.createOrder
);

// GET /api/orders/track/:orderNumber  — public order tracking
router.get('/track/:orderNumber', ordersController.trackOrder);

// ─── Agent ─────────────────────────────────────────────────────────────────────

// GET /api/orders/my  — agent's own orders
router.get('/my', authenticate, authorize('AGENT'), ordersController.getMyOrders);

// ─── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/orders  — all orders (admin)
router.get('/', authenticate, authorize('ADMIN'), ordersController.listOrders);

// GET /api/orders/:id  — single order (admin)
router.get('/:id', authenticate, authorize('ADMIN'), ordersController.getOrder);

// PATCH /api/orders/:id/retry
router.patch('/:id/retry', authenticate, authorize('ADMIN'), ordersController.retryFulfillment);

module.exports = router;
