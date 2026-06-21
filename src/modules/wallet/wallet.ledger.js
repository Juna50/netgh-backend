const Wallet = require('./wallet.model');
const WalletTransaction = require('./transaction.model');

/**
 * 💰 CREDIT WALLET
 * Used for:
 * - Paystack deposit success
 * - Admin manual credit
 */
async function creditWallet(userId, amount, description, meta = {}) {
  if (!userId) throw new Error('userId is required');
  if (!amount || amount <= 0) throw new Error('Invalid credit amount');

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { new: true, upsert: true }
  );

  await WalletTransaction.create({
    user: userId,
    wallet: wallet._id,
    type: 'credit',
    amount,
    description,
    meta,
    status: 'completed',
  });

  return wallet;
}

/**
 * 💸 DEBIT WALLET
 * Used for:
 * - Orders
 * - Withdrawals
 * - Admin debit
 */
async function debitWallet(userId, amount, description, meta = {}) {
  if (!userId) throw new Error('userId is required');
  if (!amount || amount <= 0) throw new Error('Invalid debit amount');

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  wallet.balance -= amount;
  await wallet.save();

  await WalletTransaction.create({
    user: userId,
    wallet: wallet._id,
    type: 'debit',
    amount,
    description,
    meta,
    status: 'completed',
  });

  return wallet;
}

/**
 * 📊 GET BALANCE (helper)
 */
async function getBalance(userId) {
  const wallet = await Wallet.findOne({ user: userId });
  return wallet?.balance || 0;
}

module.exports = {
  creditWallet,
  debitWallet,
  getBalance,
};