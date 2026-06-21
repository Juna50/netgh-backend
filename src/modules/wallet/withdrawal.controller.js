const WithdrawalService = require("./withdrawal.service");
const { successResponse } = require("../../shared/utils");

const WithdrawalController = {
  // 🧾 Agent request withdrawal
  async request(req, res) {
    const { amount, method, accountDetails } = req.body;

    const withdrawal = await WithdrawalService.requestWithdrawal(
      req.user._id,
      amount,
      method,
      accountDetails
    );

    successResponse(res, {
      message: "Withdrawal request submitted",
      data: withdrawal,
    });
  },

  // ✅ Admin approve
  async approve(req, res) {
    const withdrawal = await WithdrawalService.approveWithdrawal(
      req.params.id,
      req.user._id
    );

    successResponse(res, {
      message: "Withdrawal approved",
      data: withdrawal,
    });
  },

  // 💸 Admin mark paid
  async markPaid(req, res) {
    const withdrawal = await WithdrawalService.markAsPaid(req.params.id);

    successResponse(res, {
      message: "Withdrawal completed",
      data: withdrawal,
    });
  },
};

module.exports = WithdrawalController;