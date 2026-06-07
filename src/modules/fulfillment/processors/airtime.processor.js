const logger = require('../../../config/logger');
const Product = require('../../products/product.model');
const fulfillmentService = require('../fulfillment.service');
const hubnetAdapter = require('../adapters/hubnet.adapter');
const vtpassAdapter = require('../adapters/vtpass.adapter');
const manualAdapter = require('../adapters/manual.adapter');

const ADAPTER_MAP = {
  HUBNET: hubnetAdapter,
  VTPASS: vtpassAdapter,
  MANUAL: manualAdapter,
};

const airtimeProcessor = {
  fulfill: async (order) => {
    const product = await Product.findById(order.product).populate('provider');
    if (!product) throw new Error('Product not found during fulfillment');

    const providerCode = product.provider?.code;
    const adapter = ADAPTER_MAP[providerCode];

    if (!adapter) throw new Error(`No adapter found for provider: ${providerCode}`);

    logger.info(`Airtime fulfillment via ${providerCode} for order ${order.orderNumber}`);

    const result = await adapter.sendAirtime({
      phone: order.recipientPhone,
      amount: order.amount,
      reference: order.orderNumber,
      network: product.network,
    });

    await fulfillmentService.markSuccess(order, result.reference, result);
    logger.info(`Airtime fulfilled for order ${order.orderNumber}`);
  },
};

module.exports = airtimeProcessor;
