const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const usersController = require('./users.controller');

const router = express.Router();

// All routes require admin
router.use(authenticate, authorize('ADMIN'));

// GET /api/users/agents
router.get('/agents', usersController.listAgents);

// GET /api/users/agents/:id
router.get('/agents/:id', usersController.getAgent);

// PATCH /api/users/agents/:id/approve
router.patch('/agents/:id/approve', usersController.approveAgent);

// PATCH /api/users/agents/:id/suspend
router.patch('/agents/:id/suspend', usersController.suspendAgent);

// PATCH /api/users/agents/:id/unsuspend
router.patch('/agents/:id/unsuspend', usersController.unsuspendAgent);

module.exports = router;
