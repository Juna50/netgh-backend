const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const authController = require('./auth.controller');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    validate,
  ],
  authController.login
);

// POST /api/auth/register-agent  (public)
router.post(
  '/register-agent',
  [
    body('fullName').trim().notEmpty().withMessage('Full name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').trim().notEmpty().withMessage('Phone number required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
    validate,
  ],
  authController.registerAgent
);

// POST /api/auth/admin-setup  (one-time admin creation using setup secret)
router.post(
  '/admin-setup',
  [
    body('fullName').trim().notEmpty().withMessage('Full name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('phone').trim().notEmpty().withMessage('Phone number required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('setupSecret').notEmpty().withMessage('Setup secret required'),
    validate,
  ],
  authController.adminSetup
);

// GET /api/auth/me
router.get('/me', authenticate, authController.getMe);

// POST /api/auth/change-password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validate,
  ],
  authController.changePassword
);

module.exports = router;
