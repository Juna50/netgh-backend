const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const Order = require('../orders/order.model');
const User = require('../users/user.model');
const Payment = require('../payments/payment.model');
const { Pin } = require('../checker-inventory/pin.model');
const Esim = require('../esim/esim.model');
const { successResponse } = require('../../shared/utils');

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

// GET /api/dashboard
router.get('/', async (req, res) => {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersToday,
    pendingOrders,
    failedOrders,
    activeAgents,
    availablePins,
    pendingEsim,
    revenueTodayAgg,
    revenueMonthAgg,
    topProductsAgg,
    topNetworksAgg,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ fulfillmentStatus: 'PENDING', paymentStatus: 'PAID' }),
    Order.countDocuments({ fulfillmentStatus: 'FAILED' }),
    User.countDocuments({ role: 'AGENT', isActive: true, isApproved: true }),
    Pin.countDocuments({ status: 'AVAILABLE' }),
    Esim.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),

    Payment.aggregate([
      { $match: { status: 'SUCCESS', paidAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Payment.aggregate([
      { $match: { status: 'SUCCESS', paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: monthStart } } },
      { $group: { _id: '$productSnapshot.name', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    Order.aggregate([
      { $match: { paymentStatus: 'PAID', createdAt: { $gte: monthStart } } },
      { $group: { _id: '$productSnapshot.network', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber customerName productSnapshot amount paymentStatus fulfillmentStatus createdAt'),
  ]);

  successResponse(res, {
    data: {
      revenueToday: revenueTodayAgg[0]?.total || 0,
      revenueMonth: revenueMonthAgg[0]?.total || 0,
      ordersToday,
      pendingOrders,
      failedOrders,
      activeAgents,
      availablePins,
      pendingEsim,
      topProducts: topProductsAgg,
      topNetworks: topNetworksAgg,
      recentOrders,
    },
  });
});

module.exports = router;
