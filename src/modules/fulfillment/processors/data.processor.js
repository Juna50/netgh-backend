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

const dataProcessor = {
  fulfill: async (order) => {
    const product = await Product.findById(order.product).populate('provider');
    if (!product) throw new Error('Product not found during fulfillment');

    const providerCode = product.provider?.code;
    const adapter = ADAPTER_MAP[providerCode];

    if (!adapter) throw new Error(`No adapter found for provider: ${providerCode}`);

    logger.info(`Data fulfillment via ${providerCode} for order ${order.orderNumber}`);

    const result = await adapter.sendData({
      phone: order.recipientPhone,
      productCode: product.providerProductCode,
      amount: order.amount,
      reference: order.orderNumber,
      network: product.network,
    });

    await fulfillmentService.markSuccess(order, result.reference, result);
    logger.info(`Data fulfilled for order ${order.orderNumber}`);
  },
};

module.exports = dataProcessor;
