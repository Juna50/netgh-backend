const Withdrawal = require("./withdrawal.model");
const WalletLedger = require("./wallet.ledger");
const { generateReference } = require("../../shared/utils");

const WithdrawalService = {
  // 🧾 Create request (agent)
  async requestWithdrawal(userId, amount, method, accountDetails) {
    if (!amount || amount <= 0) throw new Error("Invalid amount");

    const reference = generateReference("WDR");

    return await Withdrawal.create({
      user: userId,
      amount,
      method,
      accountDetails,
      reference,
      status: "PENDING",
    });
  },

  // ✅ Admin approve
  async approveWithdrawal(withdrawalId, adminId) {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");

    if (withdrawal.status !== "PENDING") {
      throw new Error("Already processed");
    }

    withdrawal.status = "APPROVED";
    withdrawal.approvedBy = adminId;
    await withdrawal.save();

    return withdrawal;
  },

  // 💸 Mark as paid + debit wallet
  async markAsPaid(withdrawalId) {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) throw new Error("Withdrawal not found");

    if (withdrawal.status !== "APPROVED") {
      throw new Error("Must be approved first");
    }

    // 💰 Debit wallet HERE (final step)
    await WalletLedger.debitWallet(
      withdrawal.user,
      withdrawal.amount,
      "Withdrawal payout",
      { withdrawalId: withdrawal._id }
    );

    withdrawal.status = "PAID";
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    return withdrawal;
  },
};

module.exports = WithdrawalService;