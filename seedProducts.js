require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/modules/products/product.model');

const providerId = '6a24b0925df4ef9cac303a1c'; // your provider ObjectId
const calcAgentPrice = (customerPrice) => +(customerPrice - 0.20).toFixed(2);

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'netgh-db',
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('🌱 Connected to MongoDB');

    // Remove existing products (optional, uncomment if needed)
    await Product.deleteMany({});
    console.log('🗑 Cleared existing products');

    const products = [
      // MTN Data Bundles
      {
        name: '1GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'MTN',
        customerPrice: 4.90,
        agentPrice: calcAgentPrice(4.90),
        provider: providerId,
        providerProductCode: 'MTN_1GB',
        description: 'MTN 1GB data bundle',
        validityDays: null,
        dataMB: 1024,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: '2GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'MTN',
        customerPrice: 9.75,
        agentPrice: calcAgentPrice(9.75),
        provider: providerId,
        providerProductCode: 'MTN_2GB',
        description: 'MTN 2GB data bundle',
        dataMB: 2048,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: '3GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'MTN',
        customerPrice: 14.20,
        agentPrice: calcAgentPrice(14.20),
        provider: providerId,
        providerProductCode: 'MTN_3GB',
        description: 'MTN 3GB data bundle',
        dataMB: 3072,
        isActive: true,
        sortOrder: 3,
      },
      {
        name: '5GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'MTN',
        customerPrice: 23.20,
        agentPrice: calcAgentPrice(23.20),
        provider: providerId,
        providerProductCode: 'MTN_5GB',
        description: 'MTN 5GB data bundle',
        dataMB: 5120,
        isActive: true,
        sortOrder: 5,
      },

      // AirtelTigo Data Bundles
      {
        name: '5GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'AT',
        customerPrice: 22.00,
        agentPrice: calcAgentPrice(22.00),
        provider: providerId,
        providerProductCode: 'AT_5GB',
        description: 'AirtelTigo 5GB data bundle',
        validityDays: 30,
        dataMB: 5120,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: '10GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'AT',
        customerPrice: 42.00,
        agentPrice: calcAgentPrice(42.00),
        provider: providerId,
        providerProductCode: 'AT_10GB',
        description: 'AirtelTigo 10GB data bundle',
        validityDays: 30,
        dataMB: 10240,
        isActive: true,
        sortOrder: 2,
      },

      // Telecel Data Bundles
      {
        name: '10GB Data Bundle',
        category: 'DATA_BUNDLE',
        network: 'TELECEL',
        customerPrice: 40.00,
        agentPrice: calcAgentPrice(40.00),
        provider: providerId,
        providerProductCode: 'TEL_10GB',
        description: 'Telecel 10GB data bundle',
        dataMB: 10240,
        isActive: true,
        sortOrder: 1,
      },

      // Result Checkers
      {
        name: 'WASSCE Result Checker',
        category: 'RESULT_CHECKER',
        network: null,
        customerPrice: 18.50,
        agentPrice: calcAgentPrice(18.50),
        provider: providerId,
        providerProductCode: 'WASSCE_PIN',
        description: 'WASSCE Result Checker PIN',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'BECE Result Checker',
        category: 'RESULT_CHECKER',
        network: null,
        customerPrice: 18.00,
        agentPrice: calcAgentPrice(18.00),
        provider: providerId,
        providerProductCode: 'BECE_PIN',
        description: 'BECE Result Checker PIN',
        isActive: true,
        sortOrder: 2,
      },
    ];

    // Insert products
    await Product.insertMany(products);
    console.log(`✅ Seeded ${products.length} products successfully!`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seedProducts();