const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { optionalAuth } = require('../../middleware/auth');
const Order = require('../orders/order.model');
const Payment = require('./payment.model');
const paystackService = require('./paystack.service');
const fulfillmentService = require('../fulfillment/fulfillment.service');
const { generateReference, successResponse } = require('../../shared/utils');
const { NotFoundError, BadRequestError, PaymentError } = require('../../shared/errors');
const logger = require('../../config/logger');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

// ─── POST /api/payments/initialize ────────────────────────────────────────────
router.post(
  '/initialize',
  optionalAuth,
  [
    body('orderId').notEmpty().withMessage('Order ID required'),
    validate,
  ],
  async (req, res) => {
    const order = await Order.findById(req.body.orderId);
    if (!order) throw new NotFoundError('Order not found');
    if (order.paymentStatus === 'PAID') throw new BadRequestError('Order already paid');

    const reference = generateReference('PSK');

    // Record payment attempt
    const payment = await Payment.create({
      order: order._id,
      reference,
      amount: order.amount,
      provider: 'PAYSTACK',
      status: 'PENDING',
    });

    // Save reference on order
    order.paystackReference = reference;
    await order.save();

    const txData = await paystackService.initializeTransaction({
      email: order.customerEmail,
      amount: order.amount,
      reference,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerName: order.customerName,
      },
    });

    successResponse(res, {
      data: {
        authorization_url: txData.authorization_url,
        reference,
        orderNumber: order.orderNumber,
      },
    });
  }
);

// ─── POST /api/payments/webhook (raw body) ────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];

  if (!paystackService.validateWebhook(req.body, signature)) {
    logger.warn('Invalid Paystack webhook signature');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  // Acknowledge immediately
  res.status(200).json({ received: true });

  try {
    const event = JSON.parse(req.body.toString());
    logger.info(`Paystack webhook: ${event.event}`);

    if (event.event === 'charge.success') {
      await handleChargeSuccess(event.data);
    }
  } catch (err) {
    logger.error('Webhook processing error:', err);
  }
});

async function handleChargeSuccess(data) {
  const reference = data.reference;

  const payment = await Payment.findOne({ reference });
  if (!payment || payment.status === 'SUCCESS') return;

  const order = await Order.findById(payment.order).populate('product');
  if (!order) return;

  // Mark payment success
  payment.status = 'SUCCESS';
  payment.channel = data.channel;
  payment.providerData = data;
  payment.paidAt = new Date();
  await payment.save();

  order.paymentStatus = 'PAID';
  order.paystackData = data;
  await order.save();

  logger.info(`Payment confirmed for order ${order.orderNumber}`);

  // Queue fulfillment
  await fulfillmentService.processOrder(order);
}

// ─── GET /api/payments/verify/:reference ──────────────────────────────────────
router.get('/verify/:reference', async (req, res) => {
  const txData = await paystackService.verifyTransaction(req.params.reference);

  if (txData.status === 'success') {
    await handleChargeSuccess(txData);
  }

  successResponse(res, { data: { status: txData.status, reference: txData.reference } });
});

// ─── GET /api/payments  (admin) ───────────────────────────────────────────────
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('order', 'orderNumber customerName amount'),
    Payment.countDocuments(),
  ]);
  successResponse(res, {
    data: payments,
    meta: { total, page: Number(page), limit: Number(limit) },
  });
});

module.exports = router;
