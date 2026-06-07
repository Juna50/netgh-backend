const logger = require('../../../config/logger');

/**
 * Manual adapter — used when fulfillment is done by an operator manually.
 * Simply logs the task and marks it as "processing" pending human action.
 */
const manualAdapter = {
  sendData: async ({ phone, productCode, amount, reference, network }) => {
    logger.info(`[MANUAL] Data order queued - Phone: ${phone}, Product: ${productCode}, Ref: ${reference}`);
    // In a real system, this could push to a Slack channel, email, or admin queue
    return {
      reference,
      status: 'manual_pending',
      message: 'Order queued for manual fulfillment',
    };
  },

  sendAirtime: async ({ phone, amount, reference, network }) => {
    logger.info(`[MANUAL] Airtime order queued - Phone: ${phone}, Amount: ${amount}, Ref: ${reference}`);
    return {
      reference,
      status: 'manual_pending',
      message: 'Order queued for manual fulfillment',
    };
  },
};

module.exports = manualAdapter;
