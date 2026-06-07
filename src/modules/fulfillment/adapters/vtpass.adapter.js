const axios = require('axios');
const logger = require('../../../config/logger');
const { FulfillmentError } = require('../../../shared/errors');

const vtpassClient = axios.create({
  baseURL: process.env.VTPASS_API_URL || 'https://vtpass.com/api',
  timeout: 30000,
});

const getHeaders = () => ({
  'api-key': process.env.VTPASS_API_KEY,
  'public-key': process.env.VTPASS_PUBLIC_KEY,
  'Content-Type': 'application/json',
});

const NETWORK_SERVICE_MAP = {
  MTN: { data: 'mtn-data', airtime: 'mtn' },
  TELECEL: { data: 'vodafone-data', airtime: 'vodafone' },
  AT: { data: 'airtel-data', airtime: 'airtel' },
};

const vtpassAdapter = {
  sendData: async ({ phone, productCode, amount, reference, network }) => {
    try {
      const serviceId = NETWORK_SERVICE_MAP[network]?.data || productCode;

      const response = await vtpassClient.post(
        '/pay',
        {
          request_id: reference,
          serviceID: serviceId,
          billersCode: phone,
          variation_code: productCode,
          amount,
          phone,
        },
        { headers: getHeaders() }
      );

      const data = response.data;
      if (data.code !== '000') {
        throw new FulfillmentError(`VTPass data failed: ${data.response_description}`);
      }

      return {
        reference: data.requestId || reference,
        status: 'success',
        raw: data,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      throw new FulfillmentError(`VTPass data delivery failed: ${err.message}`);
    }
  },

  sendAirtime: async ({ phone, amount, reference, network }) => {
    try {
      const serviceId = NETWORK_SERVICE_MAP[network]?.airtime || 'mtn';

      const response = await vtpassClient.post(
        '/pay',
        {
          request_id: reference,
          serviceID: serviceId,
          amount,
          phone,
        },
        { headers: getHeaders() }
      );

      const data = response.data;
      if (data.code !== '000') {
        throw new FulfillmentError(`VTPass airtime failed: ${data.response_description}`);
      }

      return {
        reference: data.requestId || reference,
        status: 'success',
        raw: data,
      };
    } catch (err) {
      if (err.isOperational) throw err;
      throw new FulfillmentError(`VTPass airtime delivery failed: ${err.message}`);
    }
  },
};

module.exports = vtpassAdapter;
