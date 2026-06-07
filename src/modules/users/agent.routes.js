const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const agentController = require('./agent.controller');

const router = express.Router();

router.use(authenticate, authorize('AGENT'));

// GET /api/agent/dashboard
router.get('/dashboard', agentController.getDashboard);

// GET /api/agent/profile
router.get('/profile', agentController.getProfile);

// PATCH /api/agent/profile
router.patch('/profile', agentController.updateProfile);

module.exports = router;
