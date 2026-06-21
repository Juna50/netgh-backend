const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const Afa = require('./afa.model');
const { successResponse, generateReference, paginate, getPaginationParams } = require('../../shared/utils');
const { NotFoundError, BadRequestError } = require('../../shared/errors');
const notificationService = require('../notifications/notification.service');

const router = express.Router();

// ─── Public ────────────────────────────────────────────────────────────────────

// POST /api/afa  — submit a request
router.post(
  '/',
  [
    body('customerName').trim().notEmpty().withMessage('Name required'),
    body('customerEmail').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('customerPhone').trim().notEmpty().withMessage('Phone required'),
    body('network').isIn(['MTN', 'TELECEL', 'AT']).withMessage('Valid network required'),
    validate,
  ],
  async (req, res) => {
    const { customerName, customerEmail, customerPhone, network, deviceModel, additionalNotes } = req.body;

    const afa = await Afa.create({
      reference: generateReference('AFA'),
      customerName,
      customerEmail,
      customerPhone,
      network,
      deviceModel,
      additionalNotes,
    });

    successResponse(res, {
      message: 'AFA request submitted. You will be contacted shortly.',
      data: { reference: afa.reference, status: afa.status },
      statusCode: 201,
    });
  }
);

// GET /api/afa/track/:reference
router.get('/track/:reference', async (req, res) => {
  const afa = await Afa.findOne({ reference: req.params.reference }).select(
    'reference status network createdAt updatedAt reviewNote'
  );
  if (!afa) throw new NotFoundError('AFA request not found');
  successResponse(res, { data: afa });
});

// ─── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/afa  — list all requests
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { page, limit } = getPaginationParams(req.query);
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status.toUpperCase();

  const { results, meta } = await paginate(Afa, filter, {
    page, limit,
    populate: { path: 'reviewedBy', select: 'fullName' },
  });
  successResponse(res, { data: results, meta });
});

// GET /api/afa/:id
router.get('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const afa = await Afa.findById(req.params.id).populate('reviewedBy', 'fullName');
  if (!afa) throw new NotFoundError('AFA request not found');
  successResponse(res, { data: afa });
});

// PATCH /api/afa/:id  — update status
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  [
    body('status').isIn(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED']).withMessage('Valid status required'),
    validate,
  ],
  async (req, res) => {
    const { status, reviewNote } = req.body;
    const afa = await Afa.findById(req.params.id);
    if (!afa) throw new NotFoundError('AFA request not found');

    const prevStatus = afa.status;
    afa.status = status;
    if (reviewNote) afa.reviewNote = reviewNote;
    afa.reviewedBy = req.user._id;
    afa.reviewedAt = new Date();
    if (status === 'COMPLETED') afa.completedAt = new Date();
    await afa.save();

    // Notify customer on approval
    if (status === 'APPROVED' && prevStatus !== 'APPROVED') {
      try {
        await notificationService.send('AFA_APPROVED', afa);
      } catch (err) {}
    }

    successResponse(res, { message: 'AFA request updated', data: afa });
  }
);

module.exports = router;
