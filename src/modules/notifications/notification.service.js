const nodemailer = require('nodemailer');
const logger = require('../../config/logger');

// Create transporter
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const EMAIL_TEMPLATES = {
  FULFILLMENT_SUCCESS: (order) => ({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} - Delivered ✅`,
    html: `
      <h2>Your order has been delivered!</h2>
      <p>Hi ${order.customerName},</p>
      <p>Your order <strong>${order.orderNumber}</strong> for <strong>${order.productSnapshot?.name}</strong> has been successfully fulfilled.</p>
      ${order.deliveredPins?.length ? `<p><strong>Your PIN(s):</strong> ${order.deliveredPins.join(', ')}</p>` : ''}
      <p>Thank you for using our service!</p>
    `,
  }),

  FULFILLMENT_FAILED: (order) => ({
    to: order.customerEmail,
    subject: `Order ${order.orderNumber} - Issue Encountered`,
    html: `
      <h2>We encountered an issue with your order</h2>
      <p>Hi ${order.customerName},</p>
      <p>We're sorry, but we encountered an issue fulfilling your order <strong>${order.orderNumber}</strong>.</p>
      <p>Our team is working on it. You will receive a refund if the issue is not resolved.</p>
      <p>Reference your order number when contacting support: <strong>${order.orderNumber}</strong></p>
    `,
  }),

  PAYMENT_SUCCESS: (order) => ({
    to: order.customerEmail,
    subject: `Payment Confirmed - Order ${order.orderNumber}`,
    html: `
      <h2>Payment Received ✅</h2>
      <p>Hi ${order.customerName},</p>
      <p>We've received your payment of <strong>GHS ${order.amount}</strong> for order <strong>${order.orderNumber}</strong>.</p>
      <p>Your order is being processed and will be delivered shortly.</p>
    `,
  }),

  ESIM_APPROVED: (esim) => ({
    to: esim.customerEmail,
    subject: 'eSIM Request Approved',
    html: `
      <h2>Your eSIM Request Has Been Approved</h2>
      <p>Hi ${esim.customerName},</p>
      <p>Your eSIM request (Ref: <strong>${esim.reference}</strong>) for <strong>${esim.network}</strong> has been approved.</p>
      ${esim.reviewNote ? `<p>Note from our team: ${esim.reviewNote}</p>` : ''}
      <p>We will contact you shortly with further instructions.</p>
    `,
  }),

  ORDER_CREATED: (order) => ({
    to: order.customerEmail,
    subject: `Order Received - ${order.orderNumber}`,
    html: `
      <h2>Order Received</h2>
      <p>Hi ${order.customerName},</p>
      <p>We've received your order <strong>${order.orderNumber}</strong>.</p>
      <p>Complete your payment to proceed with delivery.</p>
    `,
  }),
};

const notificationService = {
  send: async (event, data) => {
    const templateFn = EMAIL_TEMPLATES[event];
    if (!templateFn) {
      logger.warn(`No email template for event: ${event}`);
      return;
    }

    if (!process.env.SMTP_USER) {
      logger.warn('SMTP not configured — skipping email notification');
      return;
    }

    try {
      const template = templateFn(data);
      const transporter = createTransporter();

      await transporter.sendMail({
        from: `"Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        ...template,
      });

      logger.info(`Email sent: ${event} → ${template.to}`);
    } catch (err) {
      logger.error(`Email send error for ${event}: ${err.message}`);
      // Don't throw — notifications should never break the main flow
    }
  },
};

module.exports = notificationService;
