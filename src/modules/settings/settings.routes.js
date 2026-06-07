const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../../middleware/auth');
const { successResponse } = require('../../shared/utils');
const { NotFoundError } = require('../../shared/errors');

const router = express.Router();

// ─── Settings Model ────────────────────────────────────────────────────────────
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    // Business
    businessName: { type: String, default: 'VTU Platform' },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    // Payments
    momoName: { type: String, default: '' },
    momoNumber: { type: String, default: '' },
    // Platform
    maintenanceMode: { type: Boolean, default: false },
    allowAgentRegistration: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

const getSettings = async () => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) {
    settings = await Settings.create({ key: 'global' });
  }
  return settings;
};

// ─── Middleware: block if maintenance mode ─────────────────────────────────────
const checkMaintenance = async (req, res, next) => {
  // Only check for non-admin, non-auth routes
  if (req.path.startsWith('/api/auth') || req.user?.role === 'ADMIN') return next();
  const settings = await getSettings();
  if (settings.maintenanceMode) {
    return res.status(503).json({
      success: false,
      message: 'Platform is under maintenance. Please check back soon.',
    });
  }
  next();
};

// ─── Routes ────────────────────────────────────────────────────────────────────

// GET /api/settings  — public (returns safe subset)
router.get('/', async (req, res) => {
  const settings = await getSettings();
  successResponse(res, {
    data: {
      businessName: settings.businessName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      maintenanceMode: settings.maintenanceMode,
    },
  });
});

// GET /api/settings/admin  — full settings for admin
router.get('/admin', authenticate, authorize('ADMIN'), async (req, res) => {
  const settings = await getSettings();
  successResponse(res, { data: settings });
});

// PATCH /api/settings
router.patch('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const allowed = [
    'businessName', 'supportEmail', 'supportPhone',
    'momoName', 'momoNumber',
    'maintenanceMode', 'allowAgentRegistration',
  ];

  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const settings = await Settings.findOneAndUpdate({ key: 'global' }, updates, {
    new: true,
    upsert: true,
    runValidators: true,
  });

  successResponse(res, { message: 'Settings updated', data: settings });
});

module.exports = router;
module.exports.checkMaintenance = checkMaintenance;
module.exports.getSettings = getSettings;
