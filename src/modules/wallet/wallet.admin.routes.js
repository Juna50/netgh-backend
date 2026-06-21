const express = require("express");
const { Wallet } = require("./wallet.model");
const { WalletTransaction } = require("./transaction.model");
const { authenticate, authorize } = require("../../middleware/auth");
const { successResponse } = require("../../shared/utils");

const router = express.Router();

/**
 * 📊 GET ALL WALLETS (ADMIN DASHBOARD)
 */
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const wallets = await Wallet.find()
      .populate("user", "fullName email phone role")
      .sort({ updatedAt: -1 });

    successResponse(res, {
      data: wallets,
    });
  }
);

/**
 * 👤 GET SINGLE USER WALLET
 */
router.get(
  "/:userId",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const wallet = await Wallet.findOne({ user: req.params.userId })
      .populate("user", "fullName email phone");

    const transactions = await WalletTransaction.find({
      user: req.params.userId,
    }).sort({ createdAt: -1 });

    successResponse(res, {
      data: {
        wallet,
        transactions,
      },
    });
  }
);

/**
 * 📜 ALL TRANSACTIONS (GLOBAL)
 */
router.get(
  "/transactions/all",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    const transactions = await WalletTransaction.find()
      .populate("user", "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(200);

    successResponse(res, {
      data: transactions,
    });
  }
);

module.exports = router;