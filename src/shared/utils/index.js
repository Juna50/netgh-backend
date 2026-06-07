const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique order number like ORD-20241201-A1B2C3
 */
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

/**
 * Generate a reference number for payments, eSIM, etc.
 */
const generateReference = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Build a consistent API success response
 */
const successResponse = (res, { message = 'Success', data = null, statusCode = 200, meta = null } = {}) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Paginate a Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {number} page
 * @param {number} limit
 */
const paginate = async (model, filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    populate = null,
    select = null,
  } = options;

  const skip = (page - 1) * limit;
  const total = await model.countDocuments(filter);

  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) query = query.populate(populate);
  if (select) query = query.select(select);

  const results = await query;

  return {
    results,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Parse page/limit from query params with safe defaults
 */
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit };
};

/**
 * Safe JSON parse
 */
const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Format GHS currency
 */
const formatGHS = (amount) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
  }).format(amount);
};

module.exports = {
  generateOrderNumber,
  generateReference,
  successResponse,
  paginate,
  getPaginationParams,
  safeJsonParse,
  formatGHS,
};
