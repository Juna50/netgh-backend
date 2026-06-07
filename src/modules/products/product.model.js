const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name required'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['AIRTIME', 'DATA_BUNDLE', 'RESULT_CHECKER', 'ESIM'],
      index: true,
    },
    network: {
      type: String,
      enum: ['MTN', 'TELECEL', 'AT', null],
      default: null,
    },
    customerPrice: {
      type: Number,
      required: [true, 'Customer price required'],
      min: 0,
    },
    agentPrice: {
      type: Number,
      required: [true, 'Agent price required'],
      min: 0,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    providerProductCode: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // For data bundles: validity period
    validityDays: {
      type: Number,
    },
    // For data bundles: data volume in MB
    dataMB: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: savings for agent
productSchema.virtual('agentSavings').get(function () {
  return parseFloat((this.customerPrice - this.agentPrice).toFixed(2));
});

// Index for fast product lookups
productSchema.index({ category: 1, network: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
