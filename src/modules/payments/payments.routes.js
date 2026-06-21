const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../../middleware/validate");
const { optionalAuth } = require("../../middleware/auth");
const Order = require("../orders/order.model");
const Payment = require("./payment.model");
const WalletDeposit = require("../wallet/deposit.model");
const paystackService = require("./paystack.service");
const fulfillmentService = require("../fulfillment/fulfillment.service");
const { generateReference, successResponse, generateOrderNumber } = require("../../shared/utils");


const {
  NotFoundError,
  BadRequestError,
  PaymentError,
} = require("../../shared/errors");
const logger = require("../../config/logger");
const { authenticate, authorize } = require("../../middleware/auth");
const WalletLedger = require("../wallet/wallet.ledger");

const router = express.Router();

// ─── POST /api/payments/initialize ────────────────────────────────────────────
// router.post(
//   "/initialize",
//   optionalAuth,
//   [body("orderId").notEmpty().withMessage("Order ID required"), validate],
//   async (req, res) => {
//     const order = await Order.findById(req.body.orderId);
//     if (!order) throw new NotFoundError("Order not found");
//     if (order.paymentStatus === "PAID")
//       throw new BadRequestError("Order already paid");

//     const reference = generateReference("PSK");

//     // Record payment attempt
//     const payment = await Payment.create({
//       order: order._id,
//       reference,
//       amount: order.amount,
//       provider: "PAYSTACK",
//       status: "PENDING",
//     });

//     // Save reference on order
//     order.paystackReference = reference;
//     await order.save();

//     const txData = await paystackService.initializeTransaction({
//       email: order.customerEmail,
//       amount: order.amount,
//       reference,
//       metadata: {
//         orderId: order._id.toString(),
//         orderNumber: order.orderNumber,
//         customerName: order.customerName,
//       },
//     });

//     successResponse(res, {
//       data: {
//         authorization_url: txData.authorization_url,
//         reference,
//         orderNumber: order.orderNumber,
//       },
//     });
//   },
// );

router.post(
  "/initialize",
  optionalAuth,
  [
    body("amount").isNumeric().withMessage("Amount required"),
    body("productId").optional(),
    body("recipientPhone").notEmpty().withMessage("Recipient phone required"),
    validate,
  ],
  async (req, res) => {
    const { amount, productId, recipientPhone, email, customerPhone, userId, serviceType } =
      req.body;

      console.log("Payment initialization request:", {
        amount,
        productId,
        recipientPhone,
        email,
        customerPhone,
        userId,
        serviceType,
      });

    const reference = generateReference("PSK");

    /**
     * 1. Create PAYMENT INTENT (NOT ORDER)
     */
    const payment = await Payment.create({
      reference,
      amount,
      provider: "PAYSTACK",
      status: "PENDING",
      metadata: {
        productId,
        recipientPhone,
        customerPhone,
        email,
        serviceType,
        userId: req.user?._id || null,
      },
    });

    /**
     * 2. Initialize Paystack transaction
     */
    // const txData = await paystackService.initializeTransaction({
    //   // email,
    //   amount,
    //   reference,
    //   metadata: payment.metadata,
    // });

    const txData = await paystackService.initializeTransaction({
      email,
      amount,
      reference,
      metadata: payment.metadata,
    });

    return successResponse(res, {
      data: {
        authorization_url: txData.authorization_url,
        reference,
      },
    });
  },
);

// ─── POST /api/payments/webhook (raw body) ────────────────────────────────────
// router.post("/webhook", async (req, res) => {
//   const signature = req.headers["x-paystack-signature"];

//   if (!paystackService.validateWebhook(req.body, signature)) {
//     logger.warn("Invalid Paystack webhook signature");
//     return res.status(400).json({ message: "Invalid signature" });
//   }

//   // Acknowledge immediately
//   res.status(200).json({ received: true });

//   try {
//     const event = JSON.parse(req.body.toString());
//     logger.info(`Paystack webhook: ${event.event}`);

//     if (event.event === "charge.success") {
//       const metadata = event.data.metadata || {};

//       if (metadata.type === "wallet_deposit") {
//         await handleWalletDeposit(event.data);
//       } else {
//         await handleChargeSuccess(event.data);
//       }
//     }
//   } catch (err) {
//     logger.error("Webhook processing error:", err);
//   }
// });

// async function handleChargeSuccess(data) {
//   const reference = data.reference;

//   const payment = await Payment.findOne({ reference });
//   if (!payment || payment.status === "SUCCESS") return;

//   const order = await Order.findById(payment.order).populate("product");
//   if (!order) return;

//   // Mark payment success
//   payment.status = "SUCCESS";
//   payment.channel = data.channel;
//   payment.providerData = data;
//   payment.paidAt = new Date();
//   await payment.save();

//   order.paymentStatus = "PAID";
//   order.paystackData = data;
//   await order.save();

//   logger.info(`Payment confirmed for order ${order.orderNumber}`);

//   await WalletLedger.creditWallet(
//     order.user,
//     order.amount,
//     "Wallet funding via Paystack",
//     { reference: payment.reference, orderId: order._id },
//   );

//   // Queue fulfillment
//   await fulfillmentService.processOrder(order);
// }

// ─── GET /api/payments/verify/:reference ──────────────────────────────────────

// async function handleChargeSuccess(data) {
//   const reference = data.reference;

//   const payment = await Payment.findOne({ reference });
//   if (!payment || payment.status === "SUCCESS") return;

//   const order = await Order.findById(payment.order).populate("product");
//   if (!order) return;

//   // Mark payment success
//   payment.status = "SUCCESS";
//   payment.channel = data.channel;
//   payment.providerData = data;
//   payment.paidAt = new Date();
//   await payment.save();

//   order.paymentStatus = "PAID";
//   order.paystackData = data;
//   await order.save();

//   logger.info(`Payment confirmed for order ${order.orderNumber}`);

//   // 💰 WALLET CREDIT (FIXED: use agent OR fallback)
//   if (order.agent) {
//     await WalletLedger.creditWallet(
//       order.agent,
//       order.amount,
//       "Wallet funding via Paystack",
//       {
//         reference: payment.reference,
//         orderId: order._id,
//       },
//     );
//   }

//   // 🚀 Queue fulfillment
//   await fulfillmentService.processOrder(order);
// }

// async function handleChargeSuccess(data) {
//   const reference = data.reference;

//   const payment = await Payment.findOne({ reference });

//   if (!payment || payment.status === "SUCCESS") {
//     return;
//   }

//   const order = await Order.findById(payment.order).populate("product");

//   if (!order) {
//     return;
//   }

//   // Mark payment successful
//   payment.status = "SUCCESS";
//   payment.channel = data.channel;
//   payment.providerData = data;
//   payment.paidAt = new Date();

//   await payment.save();

//   // Update order
//   order.paymentStatus = "PAID";
//   order.paystackData = data;

//   await order.save();

//   logger.info(`Payment confirmed for order ${order.orderNumber}`);

//   // Process order
//   await fulfillmentService.processOrder(order);
// }

router.post("/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  if (!paystackService.validateWebhook(req.body, signature)) {
    logger.warn("Invalid Paystack webhook signature");
    return res.status(400).json({ message: "Invalid signature" });
  }

  // ACK immediately
  res.status(200).json({ received: true });

  try {
    const event = JSON.parse(req.body.toString());
    logger.info(`Paystack webhook: ${event.event}`);

    if (event.event === "charge.success") {
      await handleChargeSuccess(event.data);
    }
  } catch (err) {
    logger.error("Webhook processing error:", err);
  }
});

async function handleChargeSuccess(data) {
  const reference = data.reference;

  const payment = await Payment.findOne({ reference });

  if (!payment || payment.status === "SUCCESS") return;

  const existing = await Order.findOne({
    paymentReference: reference,
  });

  if (existing) return;
  /**
   * 1. Mark payment as successful
   */
  payment.status = "SUCCESS";
  payment.channel = data.channel;
  payment.providerData = data;
  payment.paidAt = new Date();
  await payment.save();

  /**
   * 2. CREATE ORDER HERE (ONLY NOW)
   */
  // const order = await Order.create({
  //   productId: payment.metadata.productId,
  //   recipientPhone: payment.metadata.recipientPhone,
  //   customerId: payment.metadata.userId,
  //   amount: payment.amount,

  //   paymentStatus: "PAID",
  //   paymentReference: reference,

  //   orderNumber: generateOrderNumber(),
  // });

//   const order = await Order.create({
//   productId: payment.metadata.productId,

//   recipientPhone: payment.metadata.recipientPhone,

//   customerId: payment.metadata.userId,

//   customerEmail: payment.metadata.email,   // ✅ ADD THIS
//   customerPhone: payment.metadata.customerPhone,   // ✅ ADD THIS

//   amount: payment.amount,

//   paymentStatus: "PAID",
//   paymentReference: reference,

//   orderNumber: generateOrderNumber(),
// });

logger.info("PAYMENT METADATA:", payment.metadata);

const order = await Order.create({
  product: payment.metadata.productId,

  recipientPhone: payment.metadata.recipientPhone,

  customerId: payment.metadata.userId,

  customerPhone: payment.metadata.customerPhone, // OR momo number if that's payer
  customerEmail: payment.metadata.email,          // ✅ FIXED

  amount: payment.amount,

  paymentStatus: "PAID",
  paymentReference: reference,

  orderNumber: generateOrderNumber(),
  serviceType: payment.metadata.serviceType || null, // ✅ FIXED
});
  logger.info(`Order created ${order.orderNumber}`);

  /**
   * 3. Fulfillment
   */
  // await fulfillmentService.processOrder(order);
}

async function handleWalletDeposit(data) {

  const deposit = await WalletDeposit.findOne({
    reference: data.reference,
  });

  if (!deposit || deposit.status === "SUCCESS") {
    return;
  }

  deposit.status = "SUCCESS";
  deposit.channel = data.channel;
  deposit.providerData = data;
  deposit.paidAt = new Date();

  await deposit.save();

  await WalletLedger.creditWallet(
    deposit.user,
    deposit.amount,
    "Wallet funding via Paystack",
    {
      reference: deposit.reference,
    }
  );

  logger.info(
    `Wallet funded successfully: ${deposit.reference}`
  );
}

router.get("/verify/:reference", async (req, res) => {
  const txData = await paystackService.verifyTransaction(req.params.reference);

  if (txData.status === "success") {
    await handleChargeSuccess(txData);
  }

  successResponse(res, {
    data: { status: txData.status, reference: txData.reference },
  });
});

// ─── GET /api/payments  (admin) ───────────────────────────────────────────────
router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("order", "orderNumber customerName amount"),
    Payment.countDocuments(),
  ]);
  successResponse(res, {
    data: payments,
    meta: { total, page: Number(page), limit: Number(limit) },
  });
});

module.exports = router;