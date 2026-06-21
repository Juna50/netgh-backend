// wallet.service.js

const mongoose = require("mongoose");
const { Wallet } = require("./wallet.model");
const { WalletTransaction } = require("./transaction.model");

class WalletService {
  static async credit(userId, amount, description) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const wallet = await Wallet.findOne({ user: userId }).session(session);

      if (!wallet) throw new Error("Wallet not found");

      const previousBalance = wallet.balance;

      wallet.balance += amount;

      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            user: userId,
            type: "credit",
            amount,
            reference: `CR-${Date.now()}`,
            description,
            previousBalance,
            currentBalance: wallet.balance,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return wallet;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async debit(userId, amount, description) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const wallet = await Wallet.findOne({ user: userId }).session(session);

      if (!wallet) throw new Error("Wallet not found");

      if (wallet.balance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      const previousBalance = wallet.balance;

      wallet.balance -= amount;

      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            user: userId,
            type: "debit",
            amount,
            reference: `DB-${Date.now()}`,
            description,
            previousBalance,
            currentBalance: wallet.balance,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return wallet;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  
}

module.exports = { WalletService };