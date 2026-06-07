const logger = require('../../config/logger');
const Order = require('../orders/order.model');
const notificationService = require('../notifications/notification.service');

const airtimeProcessor = require('./processors/airtime.processor');
const dataProcessor = require('./processors/data.processor');
const checkerProcessor = require('./processors/checker.processor');
const esimProcessor = require('./processors/esim.processor');

const PROCESSORS = {
  AIRTIME: airtimeProcessor,
  DATA_BUNDLE: dataProcessor,
  RESULT_CHECKER: checkerProcessor,
  ESIM: esimProcessor,
};

const fulfillmentService = {
  processOrder: async (order) => {
    const category = order.productSnapshot?.category || order.product?.category;
    const processor = PROCESSORS[category];

    if (!processor) {
      logger.error(`No processor found for category: ${category}`);
      await fulfillmentService.markFailed(order, `Unsupported product category: ${category}`);
      return;
    }

    // Mark as queued
    order.fulfillmentStatus = 'QUEUED';
    await order.save();

    try {
      order.fulfillmentStatus = 'PROCESSING';
      await order.save();

      await processor.fulfill(order);

    } catch (err) {
      logger.error(`Fulfillment error for order ${order.orderNumber}: ${err.message}`);
      await fulfillmentService.markFailed(order, err.message);
    }
  },

  markFailed: async (order, reason) => {
    order.fulfillmentStatus = 'FAILED';
    order.failureReason = reason;
    order.retryCount += 1;
    await order.save();

    try {
      await notificationService.send('FULFILLMENT_FAILED', order);
    } catch (err) {
      logger.error('Notification error after failure:', err.message);
    }
  },

  markSuccess: async (order, providerReference, providerResponse, deliveredPins = []) => {
    order.fulfillmentStatus = 'SUCCESS';
    order.providerReference = providerReference;
    order.providerResponse = providerResponse;
    order.fulfilledAt = new Date();
    if (deliveredPins.length) order.deliveredPins = deliveredPins;
    await order.save();

    // Update agent stats if applicable
    if (order.agent) {
      const User = require('../users/user.model');
      await User.findByIdAndUpdate(order.agent, {
        $inc: {
          totalOrders: 1,
          totalSavings: order.agentSavings,
        },
      });
    }

    try {
      await notificationService.send('FULFILLMENT_SUCCESS', order);
    } catch (err) {
      logger.error('Notification error after success:', err.message);
    }
  },
};

module.exports = fulfillmentService;
