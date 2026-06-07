const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Provider name required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Provider code required'],
      unique: true,
      uppercase: true,
      trim: true,
      enum: ['MANUAL', 'HUBNET', 'VTPASS', 'RELOADLY'],
    },
    type: {
      type: String,
      required: true,
      enum: ['AIRTIME', 'DATA', 'CHECKER', 'ESIM', 'ALL'],
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      type: mongoose.Schema.Types.Mixed, // Flexible per-provider config
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Provider', providerSchema);
