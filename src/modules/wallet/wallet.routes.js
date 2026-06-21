const express = require("express");
const { authenticate, authorize } = require("../../middleware/auth");
const { WalletController } = require("./wallet.controller");

const Deposit = require("./deposit.model");
const paystackService = require("../payments/paystack.service");
const { generateReference } = require("../../shared/utils");

const router = express.Router();

router.use(authenticate);

router.get("/", WalletController.getWallet);

router.get("/transactions", WalletController.getTransactions);

router.post(
  "/fund",
  authorize("ADMIN"),
  WalletController.fundWallet
);

router.post(
  "/deposit",
  authenticate,
  authorize("AGENT"),
  WalletController.requestDeposit
);

// router.get(
//   "/deposit",
//   authenticate,
//   authorize("AGENT"),
//   WalletController.getMyDeposits
// );

router.post(
  "/deposit/:id/approve",
  authenticate,
  authorize("ADMIN"),
  WalletController.approveDeposit
);

router.post(
  "/deposit/:id/reject",
  authenticate,
  authorize("ADMIN"),
  WalletController.rejectDeposit
);

// router.post(
//   "/deposit/initialize",
//   authenticate,
//   authorize("AGENT"),
//   async (req, res) => {
//     const { amount } = req.body;

//     const reference = generateReference("WLT");

//     await Deposit.create({
//       user: req.user.id,
//       amount,
//       reference,
//     });
//     console.log("Deposit created:", deposit);


//     const tx = await paystackService.initializeTransaction({
//       email: req.user.email,
//       amount,
//       reference,
//       metadata: {
//         type: "wallet_deposit",
//         userId: req.user.id,
//       },
//     });

//     res.json({
//       authorization_url: tx.authorization_url,
//       reference,
//     });
//   }
// );


router.post(
  "/deposit/initialize",
  authenticate,
  async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new BadRequestError("Invalid deposit amount");
    }

    const reference = generateReference("DEP");

    // ✅ CREATE DEPOSIT FIRST (CRITICAL)
    const deposit = await Deposit.create({
      user: req.user.id,
      amount,
      reference,
      status: "pending",
    });

    const txData = await paystackService.initializeTransaction({
      email: req.user.email,
      amount,
      reference,
      metadata: {
        type: "wallet_deposit",
        depositId: deposit._id.toString(),
        userId: req.user.id,
      },
    });

    return res.json({
      success: true,
      authorization_url: txData.authorization_url,
      reference,
    });
  }
);

module.exports = router;