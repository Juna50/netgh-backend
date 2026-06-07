const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { UnauthorizedError, BadRequestError, ConflictError, ForbiddenError } = require('../../shared/errors');
const { successResponse } = require('../../shared/utils');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const authController = {
  login: async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) throw new UnauthorizedError('Account suspended. Contact support.');
    if (user.role === 'AGENT' && !user.isApproved) {
      throw new ForbiddenError('Agent account pending admin approval.');
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    successResponse(res, {
      message: 'Login successful',
      data: { token, user, role: user.role },
    });
  },

  registerAgent: async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ConflictError('Email already registered');

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role: 'AGENT',
      isApproved: false,
    });

    successResponse(res, {
      message: 'Registration successful. Your account is pending admin approval.',
      data: { user },
      statusCode: 201,
    });
  },

  adminSetup: async (req, res) => {
    const { fullName, email, phone, password, setupSecret } = req.body;

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      throw new ForbiddenError('Invalid setup secret');
    }

    const existing = await User.findOne({ role: 'ADMIN' });
    if (existing) throw new ConflictError('Admin account already exists');

    const admin = await User.create({
      fullName,
      email,
      phone,
      password,
      role: 'ADMIN',
      isApproved: true,
      isActive: true,
    });

    const token = signToken(admin._id);

    successResponse(res, {
      message: 'Admin account created',
      data: { token, user: admin },
      statusCode: 201,
    });
  },

  getMe: async (req, res) => {
    successResponse(res, { data: { user: req.user } });
  },

  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      throw new BadRequestError('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, { message: 'Password changed successfully' });
  },
};

module.exports = authController;
