const User = require('./user.model');
const { NotFoundError } = require('../../shared/errors');
const { successResponse, paginate, getPaginationParams } = require('../../shared/utils');

const usersController = {
  listAgents: async (req, res) => {
    const { page, limit } = getPaginationParams(req.query);
    const { status, search } = req.query;

    const filter = { role: 'AGENT' };
    if (status === 'approved') filter.isApproved = true;
    if (status === 'pending') filter.isApproved = false;
    if (status === 'suspended') filter.isActive = false;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const { results, meta } = await paginate(User, filter, { page, limit });
    successResponse(res, { data: results, meta });
  },

  getAgent: async (req, res) => {
    const agent = await User.findOne({ _id: req.params.id, role: 'AGENT' });
    if (!agent) throw new NotFoundError('Agent not found');
    successResponse(res, { data: agent });
  },

  approveAgent: async (req, res) => {
    const agent = await User.findOne({ _id: req.params.id, role: 'AGENT' });
    if (!agent) throw new NotFoundError('Agent not found');
    agent.isApproved = true;
    agent.isActive = true;
    await agent.save();
    successResponse(res, { message: 'Agent approved', data: agent });
  },

  suspendAgent: async (req, res) => {
    const agent = await User.findOne({ _id: req.params.id, role: 'AGENT' });
    if (!agent) throw new NotFoundError('Agent not found');
    agent.isActive = false;
    await agent.save();
    successResponse(res, { message: 'Agent suspended', data: agent });
  },

  unsuspendAgent: async (req, res) => {
    const agent = await User.findOne({ _id: req.params.id, role: 'AGENT' });
    if (!agent) throw new NotFoundError('Agent not found');
    agent.isActive = true;
    await agent.save();
    successResponse(res, { message: 'Agent reactivated', data: agent });
  },
};

module.exports = usersController;
