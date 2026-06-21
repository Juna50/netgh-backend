const express = require("express");
const WithdrawalController = require("./withdrawal.controller");
const { authenticate, authorize } = require("../../middleware/auth");

const router = express.Router();

// 🧾 Agent request withdrawal
router.post("/request", authenticate, WithdrawalController.request);

// 🔐 Admin approve
router.patch(
  "/:id/approve",
  authenticate,
  authorize("ADMIN"),
  WithdrawalController.approve
);

// 💸 Admin mark as paid
router.patch(
  "/:id/paid",
  authenticate,
  authorize("ADMIN"),
  WithdrawalController.markPaid
);

module.exports = router;