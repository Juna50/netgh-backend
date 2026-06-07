const logger = require('../../../config/logger');
const fulfillmentService = require('../fulfillment.service');

const esimProcessor = {
  fulfill: async (order) => {
    // eSIM fulfillment is manual — admin reviews and completes
    // We just mark the order as PROCESSING so admin can pick it up
    order.fulfillmentStatus = 'PROCESSING';
    await order.save();
    logger.info(`eSIM order ${order.orderNumber} awaiting manual fulfillment`);
    // Notification handled separately by eSIM module
  },
};

module.exports = esimProcessor;
