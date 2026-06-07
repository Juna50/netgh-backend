const axios = require('axios');
const logger = require('../../../config/logger');
const { FulfillmentError } = require('../../../shared/errors');

const hubnetClient = axios.create({
  baseURL: process.env.HUBNET_API_URL || 'https://api.hubnet.app',
  headers: {
    Authorization: `Token ${process.env.HUBNET_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const hubnetAdapter = {
  sendData: async ({ phone, productCode, amount, reference, network }) => {
    try {
      logger.debug(`HubNet sendData: phone=${phone}, product=${productCode}`);

      const response = await hubnetClient.post('/api/data', {
        recipient: phone,
        data_plan: productCode,
        request_id: reference,
        network: network?.toLowerCase(),
      });

      const data = response.data;

      if (data.status !== 'success') {
        throw new FulfillmentError(`HubNet data purchase failed: ${data.message}`);
      }

      return {
        reference: data.reference || reference,
        providerOrderId: data.order_id,
        status: data.status,
        raw: data,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      logger.error('HubNet sendData error:', err.response?.data || err.message);
      throw new FulfillmentError(`HubNet data delivery failed: ${err.response?.data?.message || err.message}`);
    }
  },

  sendAirtime: async ({ phone, amount, reference, network }) => {
    try {
      logger.debug(`HubNet sendAirtime: phone=${phone}, amount=${amount}`);

      const response = await hubnetClient.post('/api/airtime', {
        recipient: phone,
        amount,
        request_id: reference,
        network: network?.toLowerCase(),
      });

      const data = response.data;

      if (data.status !== 'success') {
        throw new FulfillmentError(`HubNet airtime failed: ${data.message}`);
      }

      return {
        reference: data.reference || reference,
        status: data.status,
        raw: data,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      logger.error('HubNet sendAirtime error:', err.response?.data || err.message);
      throw new FulfillmentError(`HubNet airtime delivery failed: ${err.response?.data?.message || err.message}`);
    }
  },

  checkBalance: async () => {
    const response = await hubnetClient.get('/api/balance');
    return response.data;
  },
};

module.exports = hubnetAdapter;
