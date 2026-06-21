const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    // Snapshot of product at time of order
    productSnapshot: {
      name: String,
      category: String,
      network: String,
      providerProductCode: String,
    },
    // Who placed the order
    customerEmail: { type: String, required: true, lowercase: true },
    customerPhone: { type: String, required: true },
    // The phone/account to deliver to
    recipientPhone: { type: String },
    // If placed by an agent
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Amount agent saved vs retail price
    agentSavings: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["PENDING", "QUEUED", "PROCESSING", "SUCCESS", "FAILED"],
      default: "PENDING",
      index: true,
    },
    // Paystack
    paystackReference: { type: String, index: true },
    paystackData: { type: mongoose.Schema.Types.Mixed },
    // Provider fulfillment data
    providerReference: { type: String },
    providerResponse: { type: mongoose.Schema.Types.Mixed },
    // For checker orders — the actual PIN delivered
    deliveredPins: [{ type: String }],
    // Failure reason
    failureReason: { type: String },
    // Retry count
    retryCount: { type: Number, default: 0 },
    // Fulfilled at timestamp
    fulfilledAt: { type: Date },
    serviceType: {
      type: String,
      required: false,
    },
    serviceLabel: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

// Compound indexes for common queries
orderSchema.index({ createdAt: -1 });
orderSchema.index({ agent: 1, createdAt: -1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ paymentStatus: 1, fulfillmentStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);
