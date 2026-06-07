const express = require('express');
const { body, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize, optionalAuth } = require('../../middleware/auth');
const productsController = require('./products.controller');

const router = express.Router();

// ─── Public ────────────────────────────────────────────────────────────────────

// GET /api/products  — public, shows active products; agents see agent prices
router.get('/', optionalAuth, productsController.listProducts);

// GET /api/products/:id
router.get('/:id', optionalAuth, productsController.getProduct);

// ─── Admin ─────────────────────────────────────────────────────────────────────

// POST /api/products
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Product name required'),
    body('category').isIn(['AIRTIME', 'DATA_BUNDLE', 'RESULT_CHECKER', 'ESIM']).withMessage('Valid category required'),
    body('customerPrice').isFloat({ min: 0 }).withMessage('Valid customer price required'),
    body('agentPrice').isFloat({ min: 0 }).withMessage('Valid agent price required'),
    body('provider').notEmpty().withMessage('Provider required'),
    validate,
  ],
  productsController.createProduct
);

// PATCH /api/products/:id
router.patch('/:id', authenticate, authorize('ADMIN'), productsController.updateProduct);

// PATCH /api/products/:id/toggle
router.patch('/:id/toggle', authenticate, authorize('ADMIN'), productsController.toggleProduct);

module.exports = router;
