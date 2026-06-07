const User = require('./user.model');
const Order = require('../orders/order.model');
const { successResponse } = require('../../shared/utils');

const agentController = {
  getDashboard: async (req, res) => {
    const agentId = req.user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [ordersToday, totalOrders, successfulOrders, recentOrders] = await Promise.all([
      Order.countDocuments({ agent: agentId, createdAt: { $gte: todayStart } }),
      Order.countDocuments({ agent: agentId }),
      Order.countDocuments({ agent: agentId, fulfillmentStatus: 'SUCCESS' }),
      Order.find({ agent: agentId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('product', 'name category'),
    ]);

    const agent = await User.findById(agentId);

    successResponse(res, {
      data: {
        stats: {
          ordersToday,
          totalOrders,
          successfulOrders,
          totalSavings: agent.totalSavings,
        },
        recentOrders,
      },
    });
  },

  getProfile: async (req, res) => {
    successResponse(res, { data: req.user });
  },

  updateProfile: async (req, res) => {
    const allowed = ['fullName', 'phone'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    successResponse(res, { message: 'Profile updated', data: user });
  },
};

module.exports = agentController;
