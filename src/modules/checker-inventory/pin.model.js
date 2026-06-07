const mongoose = require('mongoose');

// ─── Batch ─────────────────────────────────────────────────────────────────────
const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    examType: {
      type: String,
      enum: ['WAEC', 'BECE'],
      required: true,
    },
    totalPins: { type: Number, default: 0 },
    availablePins: { type: Number, default: 0 },
    soldPins: { type: Number, default: 0 },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const Batch = mongoose.model('CheckerBatch', batchSchema);

// ─── Pin ───────────────────────────────────────────────────────────────────────
const pinSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckerBatch',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    pin: {
      type: String,
      required: true,
      trim: true,
    },
    serial: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'SOLD'],
      default: 'AVAILABLE',
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    soldAt: { type: Date },
  },
  { timestamps: true }
);

pinSchema.index({ product: 1, status: 1 }); // fast lookup for available pins

const Pin = mongoose.model('CheckerPin', pinSchema);

module.exports = { Batch, Pin };
