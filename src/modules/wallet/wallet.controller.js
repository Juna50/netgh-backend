// wallet.controller.js

const { Wallet } = require("./wallet.model");
const { WalletTransaction } = require("./transaction.model");
const { WalletService } = require("./wallet.service");
// const DepositRequest = require("./deposit.model");
const paystackService = require("../payments/paystack.service");
const { generateReference } = require("../../shared/utils");

const WalletController = {
  async getWallet(req, res) {
    const wallet = await Wallet.findOne({
      user: req.user.id,
    });

    res.json(wallet);
  },

  async listWallets(req, res) {
    try {
      if (!["superadmin", "agent"].includes(req.user.role)) {
        return res.status(403).json({
          message: "Not authorized",
        });
      }

      const { search } = req.query;

      let query = {};

      if (search) {
        query = {
          $or: [
            { "user.fullName": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "user.phone": { $regex: search, $options: "i" } },
          ],
        };
      }

      const wallets = await Wallet.find().populate({
        path: "user",
        select: "fullName email phone role",
      });

      // filter after populate (important fix)
      const filtered = search
        ? wallets.filter(
            (w) =>
              w.user &&
              (w.user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                w.user.email?.toLowerCase().includes(search.toLowerCase()) ||
                w.user.phone?.includes(search)),
          )
        : wallets;

      res.json({
        success: true,
        count: filtered.length,
        wallets: filtered,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async getWalletStats(req, res) {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const totalWallets = await Wallet.countDocuments();

      const totalBalanceAgg = await Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balance" },
          },
        },
      ]);

      const totalBalance = totalBalanceAgg[0]?.totalBalance || 0;

      const totalTransactions = await WalletTransaction.countDocuments();

      const creditTotal = await WalletTransaction.aggregate([
        { $match: { type: "credit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const debitTotal = await WalletTransaction.aggregate([
        { $match: { type: "debit" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      res.json({
        totalWallets,
        totalBalance,
        totalTransactions,
        totalCredit: creditTotal[0]?.total || 0,
        totalDebit: debitTotal[0]?.total || 0,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
  async getWalletSummary(req, res) {
    try {
      const { userId } = req.params;

      const wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      const transactions = await WalletTransaction.find({
        wallet: wallet._id,
      });

      const summary = transactions.reduce(
        (acc, tx) => {
          if (tx.type === "credit") acc.credit += tx.amount;
          if (tx.type === "debit") acc.debit += tx.amount;
          return acc;
        },
        { credit: 0, debit: 0 },
      );

      res.json({
        wallet,
        summary,
        balance: wallet.balance,
        totalTransactions: transactions.length,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async getTransactions(req, res) {
    const transactions = await WalletTransaction.find({
      user: req.user.id,
    }).sort("-createdAt");

    res.json(transactions);
  },

  async fundWallet(req, res) {
    const { userId, amount } = req.body;

    const wallet = await WalletService.credit(userId, amount, "Wallet funding");

    res.json({
      success: true,
      wallet,
    });
  },

  async debitWallet(req, res) {
    const { userId, amount } = req.body;

    const wallet = await WalletService.debit(userId, amount, "Wallet debiting");

    res.json({
      success: true,
      wallet,
    });
  },

  async requestDeposit(req, res) {
    try {
      const { amount, method } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          message: "Valid amount is required",
        });
      }

      const reference = generateReference("DEP");

      const deposit = await DepositRequest.create({
        agent: req.user.id,
        amount,
        method,
        reference,
      });

      // Paystack deposits
      if (method === "PAYSTACK") {
        const tx = await paystackService.initializeTransaction({
          email: req.user.email,
          amount,
          reference,
          metadata: {
            type: "wallet_deposit",
            depositId: deposit._id.toString(),
            agentId: req.user.id,
          },
        });

        return res.json({
          success: true,
          deposit,
          authorization_url: tx.authorization_url,
        });
      }

      // Manual deposits
      res.json({
        success: true,
        message: "Deposit request submitted successfully",
        deposit,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async getMyDeposits(req, res) {
    try {
      const deposits = await DepositRequest.find({
        agent: req.user.id,
      }).sort("-createdAt");

      res.json({
        success: true,
        deposits,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async approveDeposit(req, res) {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({
          message: "Forbidden",
        });
      }

      const deposit = await DepositRequest.findById(req.params.id);

      if (!deposit) {
        return res.status(404).json({
          message: "Deposit request not found",
        });
      }

      if (deposit.status !== "PENDING") {
        return res.status(400).json({
          message: "Deposit already processed",
        });
      }

      await WalletService.credit(
        deposit.agent,
        deposit.amount,
        "Manual wallet deposit",
      );

      deposit.status = "PAID";
      deposit.approvedBy = req.user.id;
      deposit.approvedAt = new Date();

      await deposit.save();

      res.json({
        success: true,
        message: "Deposit approved successfully",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async rejectDeposit(req, res) {
    try {
      if (req.user.role !== "superadmin") {
        return res.status(403).json({
          message: "Forbidden",
        });
      }

      const deposit = await DepositRequest.findById(req.params.id);

      if (!deposit) {
        return res.status(404).json({
          message: "Deposit request not found",
        });
      }

      if (deposit.status !== "PENDING") {
        return res.status(400).json({
          message: "Deposit already processed",
        });
      }

      deposit.status = "REJECTED";
      deposit.approvedBy = req.user.id;
      deposit.approvedAt = new Date();

      await deposit.save();

      res.json({
        success: true,
        message: "Deposit rejected",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = { WalletController };
