const Product = require('./product.model');
const { NotFoundError } = require('../../shared/errors');
const { successResponse, paginate, getPaginationParams } = require('../../shared/utils');

const productsController = {
  listProducts: async (req, res) => {
    const { category, network, page, limit } = req.query;
    const pag = getPaginationParams(req.query);

    const filter = { isActive: true };
    if (category) filter.category = category.toUpperCase();
    if (network) filter.network = network.toUpperCase();

    const { results, meta } = await paginate(Product, filter, {
      page: pag.page,
      limit: pag.limit,
      sort: { sortOrder: 1, customerPrice: 1 },
      populate: { path: 'provider', select: 'name code' },
    });

    // If agent is logged in, tag each product with agent price visibility
    const isAgent = req.user?.role === 'AGENT';

    const data = results.map((p) => {
      const obj = p.toJSON();
      if (!isAgent) {
        delete obj.agentPrice; // Hide agent prices from public
      }
      return obj;
    });

    successResponse(res, { data, meta });
  },

  getProduct: async (req, res) => {
    const product = await Product.findById(req.params.id).populate('provider', 'name code');
    if (!product) throw new NotFoundError('Product not found');

    const obj = product.toJSON();
    console.log(obj);
    if (req.user?.role !== 'AGENT' && req.user?.role !== 'ADMIN') {
      delete obj.agentPrice;
    }


    successResponse(res, { data: obj });
  },

  createProduct: async (req, res) => {
    const product = await Product.create(req.body);
    await product.populate('provider', 'name code');
    successResponse(res, { message: 'Product created', data: product, statusCode: 201 });
  },

  updateProduct: async (req, res) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('provider', 'name code');
    if (!product) throw new NotFoundError('Product not found');
    successResponse(res, { message: 'Product updated', data: product });
  },

  toggleProduct: async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new NotFoundError('Product not found');
    product.isActive = !product.isActive;
    await product.save();
    successResponse(res, {
      message: `Product ${product.isActive ? 'enabled' : 'disabled'}`,
      data: product,
    });
  },
};

module.exports = productsController;
