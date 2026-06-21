const axios = require("axios");
const crypto = require("crypto");
const logger = require("../../config/logger");

const PAYSTACK_BASE = "https://api.paystack.co";

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

const paystackService = {
  /**
   * Initialize a Paystack transaction
   */
  initializeTransaction: async ({
    email,
    amount,
    reference,
    metadata = {},
  }) => {
    const response = await paystackClient.post("/transaction/initialize", {
      email,
      amount: Math.round(amount * 100), // Paystack uses kobo/pesewas
      reference,
      currency: "GHS",
      metadata,
      callback_url: `${process.env.FRONTEND_URL}/wallet/callback`,
    });
    return response.data.data; // { authorization_url, access_code, reference }
  },

  /**
   * Verify a Paystack transaction
   */
  verifyTransaction: async (reference) => {
    const response = await paystackClient.get(
      `/transaction/verify/${reference}`,
    );
    return response.data.data;
  },

  /**
   * Validate Paystack webhook signature
   */
  validateWebhook: (rawBody, signature) => {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return hash === signature;
  },
};

module.exports = paystackService;
