const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema(
//   {
//     order: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Order',
//       required: true,
//       index: true,
//     },
//     reference: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     fee: {
//       type: Number,
//       default: 0,
//     },
//     currency: {
//       type: String,
//       default: 'GHS',
//     },
//     provider: {
//       type: String,
//       enum: ['PAYSTACK', 'MOMO'],
//       default: 'PAYSTACK',
//     },
//     status: {
//       type: String,
//       enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
//       default: 'PENDING',
//       index: true,
//     },
//     channel: { type: String }, // card, mobile_money, etc.
//     providerData: { type: mongoose.Schema.Types.Mixed }, // Full response from Paystack
//     paidAt: { type: Date },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model('Payment', paymentSchema);

const paymentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'GHS',
    },

    provider: {
      type: String,
      enum: ['PAYSTACK', 'MOMO'],
      default: 'PAYSTACK',
    },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },

    /**
     * 🔥 THIS is now the source of truth BEFORE order exists
     */
    metadata: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
      },
      customerPhone: {
        type: String,
        required: true,
      },

      recipientPhone: {
        type: String,
        required: true,
      },

      serviceType: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: true,
      },

      customerName: {
        type: String,
      },

      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    channel: {
      type: String, // card, mobile_money, etc.
    },

    providerData: {
      type: mongoose.Schema.Types.Mixed,
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)