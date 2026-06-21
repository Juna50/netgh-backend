const SmsLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  phone: { type: String, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ['otp', 'transactional', 'marketing'],
    index: true,
  },
  message: String, // Omitted for OTP logs
  provider: { type: String, enum: ['termii', 'twilio', 'manual'], required: true },
  providerRef: String,
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'failed'],
    default: 'queued',
    index: true,
  },
  providerResponse: Schema.Types.Mixed,
  cost: Number,     // in USD cents
  triggeredBy: String, // Event name that triggered the SMS
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false, versionKey: false });

SmsLogSchema.index({ userId: 1, createdAt: -1 });
SmsLogSchema.index({ phone: 1, type: 1, createdAt: -1 }); // For rate limiting queries

module.exports = {
  SmsLog: mongoose.model('SmsLog', SmsLogSchema),
};