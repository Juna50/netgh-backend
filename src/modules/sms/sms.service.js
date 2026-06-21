'use strict';

const axios = require('axios');
const { SmsLog } = require('../../analytics/models/Analytics.model');
const logger = require('../../../config/logger');

// ── Termii Provider (Primary) ─────────────────────────────────
class TermiiProvider {
  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.senderId = process.env.TERMII_SENDER_ID || 'N-Alert';
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://api.ng.termii.com';
  }

  async send(to, message) {
    const response = await axios.post(`${this.baseUrl}/api/sms/send`, {
      to,
      from: this.senderId,
      sms: message,
      type: 'plain',
      channel: 'dnd',
      api_key: this.apiKey,
    }, { timeout: 10000 });

    return {
      provider: 'termii',
      messageId: response.data?.message_id,
      status: 'sent',
      raw: response.data,
    };
  }
}

// ── Twilio Provider (Fallback) ────────────────────────────────
class TwilioProvider {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_PHONE_NUMBER;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  async send(to, message) {
    const response = await axios.post(this.baseUrl,
      new URLSearchParams({ To: to, From: this.from, Body: message }),
      {
        auth: { username: this.accountSid, password: this.authToken },
        timeout: 10000,
      }
    );

    return {
      provider: 'twilio',
      messageId: response.data?.sid,
      status: 'sent',
      raw: response.data,
    };
  }
}

// ── SMS Service (Provider Abstraction) ───────────────────────
class SmsService {
  constructor() {
    this.primary = new TermiiProvider();
    this.fallback = new TwilioProvider();
  }

  /**
   * Send an SMS with automatic fallback to secondary provider.
   * Logs every attempt to SmsLog.
   */
  async send({ to, message, type = 'transactional', userId, triggeredBy }) {
    const normalizedPhone = this._normalizePhone(to);
    let result = null;
    let lastError = null;

    // Sanitize OTP messages — don't log the code itself
    const logMessage = type === 'otp' ? '[OTP REDACTED]' : message;

    for (const [providerName, provider] of [['termii', this.primary], ['twilio', this.fallback]]) {
      try {
        result = await provider.send(normalizedPhone, message);
        logger.info({ provider: providerName, to: normalizedPhone, type, triggeredBy }, 'SMS sent');
        break;
      } catch (err) {
        lastError = err;
        logger.warn({ provider: providerName, to: normalizedPhone, err: err.message }, 'SMS provider failed, trying fallback');
      }
    }

    // Log attempt (regardless of success)
    try {
      await SmsLog.create({
        userId,
        phone: normalizedPhone,
        type,
        message: logMessage,
        provider: result?.provider || 'termii',
        providerRef: result?.messageId,
        status: result ? 'sent' : 'failed',
        providerResponse: result?.raw || { error: lastError?.message },
        triggeredBy,
      });
    } catch (logErr) {
      logger.error({ logErr }, 'Failed to write SMS log');
    }

    if (!result) {
      throw new Error(`All SMS providers failed: ${lastError?.message}`);
    }

    return result;
  }

  /**
   * Send an OTP code via SMS.
   * Returns the plain code (stored as hash in DB by OTP service).
   */
  async sendOtp({ phone, userId }) {
    const code = this._generateOtp();
    const message = `Your ${process.env.APP_NAME} verification code is: ${code}. Valid for 5 minutes. Do not share with anyone.`;

    await this.send({ to: phone, message, type: 'otp', userId, triggeredBy: 'auth.otp' });
    return code; // Caller hashes and stores this
  }

  _generateOtp(length = 6) {
    return String(Math.floor(Math.random() * (10 ** length))).padStart(length, '0');
  }

  _normalizePhone(phone) {
    // Ensure E.164 format
    const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '+234');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}

module.exports = new SmsService();
