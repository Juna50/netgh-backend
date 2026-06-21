const Order = require("./order.model");
const Product = require("../products/product.model");
const { NotFoundError, BadRequestError } = require("../../shared/errors");
const { resolveServiceLabel } = require("../../shared/utils/order.utils");

const {
  successResponse,
  generateOrderNumber,
  paginate,
  getPaginationParams,
} = require("../../shared/utils");
const fulfillmentService = require("../fulfillment/fulfillment.service");

const WalletLedger = require("../wallet/wallet.ledger");

const SERVICE_TYPES = {
  PRODUCT: "DATA",
  AIRTIME: "AIRTIME",
};


const ordersController = {
  // createOrder: async (req, res) => {
  //   const { productId, customerName, customerEmail, customerPhone, recipientPhone } = req.body;

  //   // Validate product exists and is active
  //   const product = await Product.findOne({ _id: productId, isActive: true }).populate('provider');
  //   if (!product) throw new NotFoundError('Product not found or unavailable');

  //   const isAgent = req.user?.role === 'AGENT';
  //   const amount = isAgent ? product.agentPrice : product.customerPrice;
  //   const agentSavings = isAgent ? product.agentSavings : 0;

  //   const order = await Order.create({
  //     orderNumber: generateOrderNumber(),
  //     product: product._id,
  //     productSnapshot: {
  //       name: product.name,
  //       category: product.category,
  //       network: product.network,
  //       providerProductCode: product.providerProductCode,
  //     },
  //     customerName,
  //     customerEmail,
  //     customerPhone,
  //     recipientPhone: recipientPhone || customerPhone,
  //     agent: isAgent ? req.user._id : null,
  //     amount,
  //     agentSavings,
  //     paymentStatus: 'PENDING',
  //     fulfillmentStatus: 'PENDING',
  //   });

  //   successResponse(res, {
  //     message: 'Order created',
  //     data: { orderId: order._id, orderNumber: order.orderNumber, amount },
  //     statusCode: 201,
  //   });
  // },

  // createOrder: async (req, res) => {
  //   const {
  //     productId,
  //     customerEmail,
  //     customerPhone,
  //     recipientPhone,
  //   } = req.body;

  //   const product = await Product.findOne({
  //     _id: productId,
  //     isActive: true,
  //   }).populate("provider");
  //   if (!product) throw new NotFoundError("Product not found or unavailable");

  //   const isAgent = req.user?.role === "AGENT";
  //   const amount = isAgent ? product.agentPrice : product.customerPrice;
  //   const agentSavings = isAgent ? product.agentSavings : 0;

  //   // 💰 WALLET DEBIT (ONLY FOR AGENTS)
  //   if (isAgent) {
  //     const wallet = await WalletLedger.debitWallet(
  //       req.user._id,
  //       amount,
  //       `Order payment - ${product.name}`,
  //       {
  //         productId: product._id,
  //         productName: product.name,
  //       },
  //     );

  //     if (!wallet) {
  //       throw new BadRequestError("Wallet debit failed");
  //     }
  //   }

  //   const order = await Order.create({
  //     orderNumber: generateOrderNumber(),
  //     product: product._id,
  //     productSnapshot: {
  //       name: product.name,
  //       category: product.category,
  //       network: product.network,
  //       providerProductCode: product.providerProductCode,
  //     },
  //     customerEmail,
  //     customerPhone,
  //     recipientPhone: recipientPhone || customerPhone,
  //     agent: isAgent ? req.user._id : null,
  //     amount,
  //     agentSavings,
  //     paymentStatus: isAgent ? "PAID" : "PENDING",
  //     fulfillmentStatus: "PENDING",
  //   });

  //   // 🚀 IMMEDIATE FULFILLMENT FOR WALLET PAID ORDERS
  //   if (isAgent) {
  //     await fulfillmentService.processOrder(order);
  //   }

  //   successResponse(res, {
  //     message: "Order created",
  //     data: {
  //       orderId: order._id,
  //       orderNumber: order.orderNumber,
  //       amount,
  //       paymentStatus: order.paymentStatus,
  //     },
  //     statusCode: 201,
  //   });

  // },

  // createOrder: async (req, res) => {
  //   const {
  //     productId,
  //     amount: requestAmount,
  //     customerEmail,
  //     customerPhone,
  //     recipientPhone,
  //     network,
  //   } = req.body;

  //   const isAgent = req.user?.role === "AGENT";

  //   let product = null;
  //   let amount = 0;
  //   let productSnapshot = null;

  //   // -----------------------------
  //   // PRODUCT ORDER (DATA BUNDLE)
  //   // -----------------------------
  //   if (productId) {
  //     product = await Product.findOne({
  //       _id: productId,
  //       isActive: true,
  //     }).populate("provider");

  //     if (!product) {
  //       throw new NotFoundError("Product not found or unavailable");
  //     }

  //     amount = isAgent ? product.agentPrice : product.customerPrice;

  //     productSnapshot = {
  //       name: product.name,
  //       category: product.category,
  //       network: product.network,
  //       providerProductCode: product.providerProductCode,
  //     };
  //   }

  //   // -----------------------------
  //   // AIRTIME ORDER
  //   // -----------------------------
  //   if (!productId && requestAmount) {
  //     amount = Number(requestAmount);

  //     productSnapshot = {
  //       name: `${network || "AIRTIME"} Airtime`,
  //       category: "AIRTIME",
  //       network: network || null,
  //       providerProductCode: null,
  //     };
  //   }

  //   // -----------------------------
  //   // VALIDATION
  //   // -----------------------------
  //   if (!amount || amount <= 0) {
  //     throw new BadRequestError("Amount is required");
  //   }

  //   if (!productId && !requestAmount) {
  //     throw new BadRequestError("Either productId or amount is required");
  //   }

  //   // -----------------------------
  //   // WALLET DEBIT (AGENTS ONLY)
  //   // -----------------------------
  //   if (isAgent) {
  //     const wallet = await WalletLedger.debitWallet(
  //       req.user._id,
  //       amount,
  //       `Order payment - ${product?.name || "Airtime"}`,
  //       {
  //         productId: product?._id || null,
  //         productName: product?.name || "Airtime",
  //       },
  //     );

  //     if (!wallet) {
  //       throw new BadRequestError("Wallet debit failed");
  //     }
  //   }

  //   // -----------------------------
  //   // CREATE ORDER
  //   // -----------------------------
  //   const order = await Order.create({
  //     orderNumber: generateOrderNumber(),

  //     product: product?._id || null,
  //     productSnapshot,

  //     customerEmail,
  //     customerPhone,
  //     recipientPhone: recipientPhone || customerPhone,

  //     agent: isAgent ? req.user._id : null,

  //     amount, // 🔥 ALWAYS STORED

  //     paymentStatus: isAgent ? "PAID" : "PENDING",
  //     fulfillmentStatus: "PENDING",
  //   });

  //   // -----------------------------
  //   // FULFILLMENT
  //   // -----------------------------
  //   if (isAgent) {
  //     await fulfillmentService.processOrder(order);
  //   }

  //   successResponse(res, {
  //     message: "Order created",
  //     data: {
  //       orderId: order._id,
  //       orderNumber: order.orderNumber,
  //       amount,
  //       paymentStatus: order.paymentStatus,
  //     },
  //     statusCode: 201,
  //   });
  // },

  createOrder: async (req, res) => {
    const {
      productId,
      amount: requestAmount,
      customerEmail,
      customerPhone,
      recipientPhone,
      network,
      serviceType: requestServiceType,
    } = req.body;

let serviceType = requestServiceType;


    const isAgent = req.user?.role === "AGENT";

    let product = null;
    let amount = 0;
    let productSnapshot = null;

    // --------------------------------------------------
    // 1. VALIDATION (only ensure at least one exists)
    // --------------------------------------------------
    if (!productId && !requestAmount) {
      throw new BadRequestError("Either productId or amount is required");
    }

    // --------------------------------------------------
    // 2. PRODUCT ORDER (PRIORITY PATH)
    // --------------------------------------------------
    if (productId) {
      serviceType = SERVICE_TYPES.PRODUCT;

      product = await Product.findOne({
        _id: productId,
        isActive: true,
      }).populate("provider");

      if (!product) {
        throw new NotFoundError("Product not found or unavailable");
      }

      amount = isAgent ? product.agentPrice : product.customerPrice;

      productSnapshot = {
        name: product.name,
        category: product.category,
        network: product.network,
        providerProductCode: product.providerProductCode,
      };
    }

    // --------------------------------------------------
    // 3. AIRTIME / SERVICE (ONLY IF NO PRODUCT)
    // --------------------------------------------------
    if (!productId) {
      serviceType = SERVICE_TYPES.AIRTIME;

      if (serviceType && !Object.values(SERVICE_TYPES).includes(serviceType)) {
        throw new BadRequestError("Invalid service type");
      }
      amount = Number(requestAmount);

      if (!amount || amount <= 0) {
        throw new BadRequestError("Valid amount is required");
      }

      productSnapshot = {
        name: `${network || "AIRTIME"} Airtime`,
        category: "AIRTIME",
        network: network || null,
        providerProductCode: null,
      };
    }

    // --------------------------------------------------
    // 4. WALLET DEBIT (AGENTS ONLY)
    // --------------------------------------------------
    if (isAgent) {
      const wallet = await WalletLedger.debitWallet(
        req.user._id,
        amount,
        `Order payment - ${product?.name || productSnapshot.name}`,
        {
          productId: product?._id || null,
          productName: product?.name || productSnapshot.name,
        },
      );

      if (!wallet) {
        throw new BadRequestError("Wallet debit failed");
      }
    }

    // --------------------------------------------------
    // 5. CREATE ORDER
    // --------------------------------------------------
    const order = await Order.create({
      orderNumber: generateOrderNumber(),

      product: product?._id || null,
      productSnapshot,

      customerEmail,
      customerPhone,
      recipientPhone: recipientPhone || customerPhone,

      agent: isAgent ? req.user._id : null,
      serviceType, // ✅ ADD THIS

      amount,

      paymentStatus: isAgent ? "PAID" : "PENDING",
      fulfillmentStatus: "PENDING",
    });

    // --------------------------------------------------
    // 6. FULFILLMENT
    // --------------------------------------------------
    if (isAgent) {
      await fulfillmentService.processOrder(order);
    }

    return successResponse(res, {
      message: "Order created successfully",
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount,
        serviceType, // optional but useful
        paymentStatus: order.paymentStatus,
      },
      statusCode: 201,
    });
  },

  trackOrder: async (req, res) => {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .select(
        "orderNumber paymentStatus fulfillmentStatus productSnapshot amount createdAt updatedAt fulfilledAt deliveredPins",
      )
      .populate("product", "name category network");

    if (!order) throw new NotFoundError("Order not found");

    // Only show delivered pins if fulfilled successfully
    const data = order.toJSON();
    if (data.fulfillmentStatus !== "SUCCESS") {
      delete data.deliveredPins;
    }

    successResponse(res, { data });
  },

  getMyOrders: async (req, res) => {
    const { page, limit } = getPaginationParams(req.query);
    const { results, meta } = await paginate(
      Order,
      { agent: req.user._id },
      { page, limit, populate: { path: "product", select: "name category" } },
    );
    successResponse(res, { data: results, meta });
  },

  // listOrders: async (req, res) => {
  //   const { page, limit } = getPaginationParams(req.query);
  //   const {
  //     status,
  //     paymentStatus,
  //     fulfillmentStatus,
  //     category,
  //     search,
  //     from,
  //     to,
  //   } = req.query;

  //   const filter = {};
  //   if (paymentStatus) filter.paymentStatus = paymentStatus.toUpperCase();
  //   if (fulfillmentStatus)
  //     filter.fulfillmentStatus = fulfillmentStatus.toUpperCase();
  //   if (from || to) {
  //     filter.createdAt = {};
  //     if (from) filter.createdAt.$gte = new Date(from);
  //     if (to) filter.createdAt.$lte = new Date(to);
  //   }
  //   if (category) filter["productSnapshot.category"] = category.toUpperCase();
  //   if (search) {
  //     filter.$or = [
  //       { orderNumber: { $regex: search, $options: "i" } },
  //       { customerEmail: { $regex: search, $options: "i" } },
  //       { customerPhone: { $regex: search, $options: "i" } },
  //       { customerName: { $regex: search, $options: "i" } },
  //     ];
  //   }

  //   const { results, meta } = await paginate(Order, filter, {
  //     page,
  //     limit,
  //     populate: [
  //       { path: "product", select: "name category" },
  //       { path: "agent", select: "fullName email" },
  //     ],
  //   });
  //   successResponse(res, { data: results, meta });
  // },


listOrders: async (req, res) => {
  const { page, limit } = getPaginationParams(req.query);

  const {
    paymentStatus,
    fulfillmentStatus,
    category,
    search,
    from,
    to,
  } = req.query;

  const filter = {};

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus.toUpperCase();
  }

  if (fulfillmentStatus) {
    filter.fulfillmentStatus = fulfillmentStatus.toUpperCase();
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) filter.createdAt.$gte = new Date(from);

    if (to) filter.createdAt.$lte = new Date(to);
  }

  // If category now represents service type
  if (category) {
    filter.serviceType = category.toUpperCase();
  }

  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
      { customerPhone: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
  }

  const { results, meta } = await paginate(Order, filter, {
    page,
    limit,
    populate: [
      { path: "product", select: "name category" },
      { path: "agent", select: "fullName email" },
    ],
  });

  const data = results.map(order => {
    const o = order.toObject ? order.toObject() : order;

    return {
      ...o,
      serviceLabel: resolveServiceLabel(o),
    };
  });

  successResponse(res, { data, meta });
},
  getOrder: async (req, res) => {
    const order = await Order.findById(req.params.id)
      .populate("product")
      .populate("agent", "fullName email phone");
    if (!order) throw new NotFoundError("Order not found");
    successResponse(res, { data: order });
  },

  updateOrder: async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) throw new NotFoundError("Order not found");

    const { paymentStatus, fulfillmentStatus, failureReason } = req.body;

    // Allow only valid updates (basic guard)
    const allowedPayment = ["PENDING", "PAID", "FAILED"];
    const allowedFulfillment = [
      "PENDING",
      "QUEUED",
      "PROCESSING",
      "SUCCESS",
      "FAILED",
    ];

    if (paymentStatus && !allowedPayment.includes(paymentStatus)) {
      throw new BadRequestError("Invalid payment status");
    }

    if (fulfillmentStatus && !allowedFulfillment.includes(fulfillmentStatus)) {
      throw new BadRequestError("Invalid fulfillment status");
    }

    // Apply updates
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (fulfillmentStatus) order.fulfillmentStatus = fulfillmentStatus;
    if (failureReason !== undefined) order.failureReason = failureReason;

    // Optional business logic
    if (fulfillmentStatus === "SUCCESS") {
      order.fulfilledAt = new Date();
    }

    await order.save();

    successResponse(res, {
      message: "Order updated successfully",
      data: order,
    });
  },

  retryFulfillment: async (req, res) => {
    const order = await Order.findById(req.params.id).populate("product");
    if (!order) throw new NotFoundError("Order not found");
    if (order.paymentStatus !== "PAID")
      throw new BadRequestError("Cannot retry — order not paid");
    if (order.fulfillmentStatus === "SUCCESS")
      throw new BadRequestError("Order already fulfilled");

    await fulfillmentService.processOrder(order);
    successResponse(res, {
      message: "Fulfillment retry triggered",
      data: order,
    });
  },

};

module.exports = ordersController;
