const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const Esim = require('./esim.model');
const { successResponse, generateReference, paginate, getPaginationParams } = require('../../shared/utils');
const { NotFoundError, BadRequestError } = require('../../shared/errors');
const notificationService = require('../notifications/notification.service');

const router = express.Router();

// ─── Public ────────────────────────────────────────────────────────────────────

// POST /api/esim  — submit a request
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

    const esim = await Esim.create({
      reference: generateReference('ESIM'),
      customerName,
      customerEmail,
      customerPhone,
      network,
      deviceModel,
      additionalNotes,
    });

    successResponse(res, {
      message: 'eSIM request submitted. You will be contacted shortly.',
      data: { reference: esim.reference, status: esim.status },
      statusCode: 201,
    });
  }
);

// GET /api/esim/track/:reference
router.get('/track/:reference', async (req, res) => {
  const esim = await Esim.findOne({ reference: req.params.reference }).select(
    'reference status network createdAt updatedAt reviewNote'
  );
  if (!esim) throw new NotFoundError('eSIM request not found');
  successResponse(res, { data: esim });
});

// ─── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/esim  — list all requests
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { page, limit } = getPaginationParams(req.query);
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status.toUpperCase();

  const { results, meta } = await paginate(Esim, filter, {
    page, limit,
    populate: { path: 'reviewedBy', select: 'fullName' },
  });
  successResponse(res, { data: results, meta });
});

// GET /api/esim/:id
router.get('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const esim = await Esim.findById(req.params.id).populate('reviewedBy', 'fullName');
  if (!esim) throw new NotFoundError('eSIM request not found');
  successResponse(res, { data: esim });
});

// PATCH /api/esim/:id  — update status
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
    const esim = await Esim.findById(req.params.id);
    if (!esim) throw new NotFoundError('eSIM request not found');

    const prevStatus = esim.status;
    esim.status = status;
    if (reviewNote) esim.reviewNote = reviewNote;
    esim.reviewedBy = req.user._id;
    esim.reviewedAt = new Date();
    if (status === 'COMPLETED') esim.completedAt = new Date();
    await esim.save();

    // Notify customer on approval
    if (status === 'APPROVED' && prevStatus !== 'APPROVED') {
      try {
        await notificationService.send('ESIM_APPROVED', esim);
      } catch (err) {}
    }

    successResponse(res, { message: 'eSIM request updated', data: esim });
  }
);

module.exports = router;
