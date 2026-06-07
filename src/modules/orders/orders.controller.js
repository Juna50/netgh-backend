const Order = require('./order.model');
const Product = require('../products/product.model');
const { NotFoundError, BadRequestError } = require('../../shared/errors');
const { successResponse, generateOrderNumber, paginate, getPaginationParams } = require('../../shared/utils');
const fulfillmentService = require('../fulfillment/fulfillment.service');

const ordersController = {
  createOrder: async (req, res) => {
    const { productId, customerName, customerEmail, customerPhone, recipientPhone } = req.body;

    // Validate product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true }).populate('provider');
    if (!product) throw new NotFoundError('Product not found or unavailable');

    const isAgent = req.user?.role === 'AGENT';
    const amount = isAgent ? product.agentPrice : product.customerPrice;
    const agentSavings = isAgent ? product.agentSavings : 0;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      product: product._id,
      productSnapshot: {
        name: product.name,
        category: product.category,
        network: product.network,
        providerProductCode: product.providerProductCode,
      },
      customerName,
      customerEmail,
      customerPhone,
      recipientPhone: recipientPhone || customerPhone,
      agent: isAgent ? req.user._id : null,
      amount,
      agentSavings,
      paymentStatus: 'PENDING',
      fulfillmentStatus: 'PENDING',
    });

    successResponse(res, {
      message: 'Order created',
      data: { orderId: order._id, orderNumber: order.orderNumber, amount },
      statusCode: 201,
    });
  },

  trackOrder: async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .select('orderNumber paymentStatus fulfillmentStatus productSnapshot amount createdAt updatedAt fulfilledAt deliveredPins')
      .populate('product', 'name category network');

    if (!order) throw new NotFoundError('Order not found');

    // Only show delivered pins if fulfilled successfully
    const data = order.toJSON();
    if (data.fulfillmentStatus !== 'SUCCESS') {
      delete data.deliveredPins;
    }

    successResponse(res, { data });
  },

  getMyOrders: async (req, res) => {
    const { page, limit } = getPaginationParams(req.query);
    const { results, meta } = await paginate(
      Order,
      { agent: req.user._id },
      { page, limit, populate: { path: 'product', select: 'name category' } }
    );
    successResponse(res, { data: results, meta });
  },

  listOrders: async (req, res) => {
    const { page, limit } = getPaginationParams(req.query);
    const { status, paymentStatus, fulfillmentStatus, category, search, from, to } = req.query;

    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus.toUpperCase();
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus.toUpperCase();
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (category) filter['productSnapshot.category'] = category.toUpperCase();
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }

    const { results, meta } = await paginate(Order, filter, {
      page,
      limit,
      populate: [
        { path: 'product', select: 'name category' },
        { path: 'agent', select: 'fullName email' },
      ],
    });
    successResponse(res, { data: results, meta });
  },

  getOrder: async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate('product')
      .populate('agent', 'fullName email phone');
    if (!order) throw new NotFoundError('Order not found');
    successResponse(res, { data: order });
  },

  retryFulfillment: async (req, res) => {
    const order = await Order.findById(req.params.id).populate('product');
    if (!order) throw new NotFoundError('Order not found');
    if (order.paymentStatus !== 'PAID') throw new BadRequestError('Cannot retry — order not paid');
    if (order.fulfillmentStatus === 'SUCCESS') throw new BadRequestError('Order already fulfilled');

    await fulfillmentService.processOrder(order);
    successResponse(res, { message: 'Fulfillment retry triggered', data: order });
  },
};

module.exports = ordersController;
