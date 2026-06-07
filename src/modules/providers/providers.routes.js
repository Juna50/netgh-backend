const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const Provider = require('./provider.model');
const { successResponse } = require('../../shared/utils');
const { NotFoundError } = require('../../shared/errors');

const router = express.Router();

// GET /api/providers  (admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const providers = await Provider.find().sort({ priority: 1 });
  successResponse(res, { data: providers });
});

// POST /api/providers
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty(),
    body('type').isIn(['AIRTIME', 'DATA', 'CHECKER', 'ESIM', 'ALL']),
    validate,
  ],
  async (req, res) => {
    const provider = await Provider.create(req.body);
    successResponse(res, { message: 'Provider created', data: provider, statusCode: 201 });
  }
);

// PATCH /api/providers/:id
router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!provider) throw new NotFoundError('Provider not found');
  successResponse(res, { message: 'Provider updated', data: provider });
});

module.exports = router;
