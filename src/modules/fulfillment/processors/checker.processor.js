const logger = require('../../../config/logger');
const Pin = require('../../checker-inventory/pin.model');
const fulfillmentService = require('../fulfillment.service');
const { FulfillmentError } = require('../../../shared/errors');

const checkerProcessor = {
  fulfill: async (order) => {
    const quantity = order.quantity || 1;

    // Pull available PINs atomically
    const pins = await Pin.find({
      product: order.product,
      status: 'AVAILABLE',
    }).limit(quantity);

    if (pins.length < quantity) {
      throw new FulfillmentError(`Insufficient checker stock. Available: ${pins.length}, Required: ${quantity}`);
    }

    // Mark PINs as sold
    const pinIds = pins.map((p) => p._id);
    await Pin.updateMany({ _id: { $in: pinIds } }, { status: 'SOLD', soldAt: new Date(), order: order._id });

    const deliveredPins = pins.map((p) => p.pin);

    logger.info(`Checker PINs delivered for order ${order.orderNumber}: ${deliveredPins.join(', ')}`);

    await fulfillmentService.markSuccess(
      order,
      `CHECKER-${order.orderNumber}`,
      { pins: deliveredPins },
      deliveredPins
    );
  },
};

module.exports = checkerProcessor;
