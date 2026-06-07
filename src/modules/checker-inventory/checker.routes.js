const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { Batch, Pin } = require('./pin.model');
const { successResponse, paginate, getPaginationParams } = require('../../shared/utils');
const { NotFoundError, BadRequestError } = require('../../shared/errors');
const logger = require('../../config/logger');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All checker routes require admin
router.use(authenticate, authorize('ADMIN'));

// GET /api/checker/stats
router.get('/stats', async (req, res) => {
  const [available, sold] = await Promise.all([
    Pin.countDocuments({ status: 'AVAILABLE' }),
    Pin.countDocuments({ status: 'SOLD' }),
  ]);
  successResponse(res, { data: { available, sold, total: available + sold } });
});

// GET /api/checker/batches
router.get('/batches', async (req, res) => {
  const { page, limit } = getPaginationParams(req.query);
  const { results, meta } = await paginate(Batch, {}, {
    page, limit,
    populate: [
      { path: 'product', select: 'name' },
      { path: 'uploadedBy', select: 'fullName' },
    ],
  });
  successResponse(res, { data: results, meta });
});

// POST /api/checker/batch  — create a batch
router.post(
  '/batch',
  [
    body('name').trim().notEmpty(),
    body('productId').notEmpty(),
    body('examType').isIn(['WAEC', 'BECE']),
    validate,
  ],
  async (req, res) => {
    const batch = await Batch.create({
      name: req.body.name,
      product: req.body.productId,
      examType: req.body.examType,
      uploadedBy: req.user._id,
    });
    successResponse(res, { message: 'Batch created', data: batch, statusCode: 201 });
  }
);

// POST /api/checker/batch/:id/pins  — upload CSV of pins
router.post('/batch/:id/pins', upload.single('file'), async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new NotFoundError('Batch not found');
  if (!req.file) throw new BadRequestError('CSV file required');

  const csvContent = req.file.buffer.toString('utf8');
  const pins = [];

  await new Promise((resolve, reject) => {
    parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }, (err, records) => {
      if (err) return reject(new BadRequestError('Invalid CSV format'));
      records.forEach((row) => {
        if (row.pin) {
          pins.push({
            batch: batch._id,
            product: batch.product,
            pin: row.pin.trim(),
            serial: row.serial?.trim() || null,
          });
        }
      });
      resolve();
    });
  });

  if (!pins.length) throw new BadRequestError('No valid pins found in CSV');

  await Pin.insertMany(pins, { ordered: false });

  batch.totalPins += pins.length;
  batch.availablePins += pins.length;
  await batch.save();

  logger.info(`Uploaded ${pins.length} pins to batch ${batch.name}`);

  successResponse(res, {
    message: `${pins.length} pins uploaded successfully`,
    data: { count: pins.length },
  });
});

// GET /api/checker/available  — count available pins per product
router.get('/available', async (req, res) => {
  const result = await Pin.aggregate([
    { $match: { status: 'AVAILABLE' } },
    { $group: { _id: '$product', count: { $sum: 1 } } },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $project: { productId: '$_id', productName: '$product.name', count: 1, _id: 0 } },
  ]);
  successResponse(res, { data: result });
});

module.exports = router;
