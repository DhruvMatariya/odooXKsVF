import { catalogService } from '../services/catalog.service.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';

function toCategoryDTO(row) {
  return { id: row.id, name: row.name };
}

function toProductCreateDTO(row) {
  return {
    id: row.id,
    name: row.name,
    category: { id: row.category_id || row.categoryId, name: row.category?.name || row.categoryName },
    brand: row.brand,
    manufacturer: row.manufacturer,
    status: row.status,
    thumbnail: row.thumbnail,
    createdAt: row.created_at || row.createdAt,
  };
}

function toProductListDTO(row, vendorName) {
  return {
    id: row.id,
    name: row.name,
    thumbnail: row.thumbnail,
    category: row.category ? { id: row.category.id, name: row.category.name } : { id: row.categoryId, name: row.categoryName },
    brand: row.brand,
    vendorId: row.vendorId || row.vendor_user_id,
    vendorName: vendorName || '',
    inventory: { available: row.available },
    startingPrice: row.startingPrice,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export const catalogController = {
  // GET /api/v1/categories
  async getCategories(req, res) {
    const categories = await catalogService.getCategories();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: categories.map(toCategoryDTO),
    });
  },

  // POST /api/v1/products (vendor)
  async createProduct(req, res) {
    const vendorUserId = req.user.id;
    const product = await catalogService.createProduct(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.CATALOG.PRODUCT_CREATED,
      data: toProductCreateDTO(product),
    });
  },

  // GET /api/v1/products (public, paginated, filterable)
  async listProducts(req, res) {
    const result = await catalogService.listProducts(req.validated.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  },

  // GET /api/v1/products/:id (public, aggregated)
  async getProductById(req, res) {
    const product = await catalogService.getProductById(req.validated.params.id);
    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.CATALOG.PRODUCT_NOT_FOUND, 'PRODUCT_NOT_FOUND');
    }
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRODUCT_FETCHED,
      data: product,
    });
  },

  // PATCH /api/v1/products/:id (vendor, owner)
  async updateProduct(req, res) {
    const vendorUserId = req.user.id;
    const product = await catalogService.updateProduct(vendorUserId, req.validated.params.id, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRODUCT_UPDATED,
      data: toProductCreateDTO(product),
    });
  },

  // DELETE /api/v1/products/:id (vendor, owner, soft delete)
  async deleteProduct(req, res) {
    const vendorUserId = req.user.id;
    await catalogService.deleteProduct(vendorUserId, req.validated.params.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRODUCT_DELETED,
      data: null,
    });
  },

  // PATCH /api/v1/products/:id/inventory (vendor, owner)
  async updateInventory(req, res) {
    const vendorUserId = req.user.id;
    const inventory = await catalogService.updateInventory(vendorUserId, req.validated.params.id, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.INVENTORY_UPDATED,
      data: inventory,
    });
  },

  // GET /api/v1/products/:id/inventory
  async getInventory(req, res) {
    const inventory = await catalogService.getInventory(req.validated.params.id);
    if (!inventory) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.CATALOG.PRODUCT_NOT_FOUND, 'PRODUCT_NOT_FOUND');
    }
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.INVENTORY_FETCHED,
      data: inventory,
    });
  },

  // POST /api/v1/products/:id/pricing (vendor, owner)
  async createPricing(req, res) {
    const vendorUserId = req.user.id;
    const pricing = await catalogService.createPricing(vendorUserId, req.validated.params.id, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.CATALOG.PRICING_CREATED,
      data: pricing,
    });
  },

  // GET /api/v1/products/:id/pricing
  async getPricing(req, res) {
    const pricing = await catalogService.getPricing(req.validated.params.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRICING_FETCHED,
      data: pricing,
    });
  },

  // PATCH /api/v1/pricing/:id (vendor, owner via parent product)
  async updatePricing(req, res) {
    const vendorUserId = req.user.id;
    const pricing = await catalogService.updatePricing(vendorUserId, req.validated.params.id, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRICING_UPDATED,
      data: pricing,
    });
  },

  // DELETE /api/v1/pricing/:id (vendor, owner via parent product)
  async deletePricing(req, res) {
    const vendorUserId = req.user.id;
    await catalogService.deletePricing(vendorUserId, req.validated.params.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.PRICING_DELETED,
      data: null,
    });
  },

  // POST /api/v1/vendor/return-slots (vendor)
  async createReturnSlot(req, res) {
    const vendorUserId = req.user.id;
    const slot = await catalogService.createReturnSlot(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.CATALOG.RETURN_SLOT_CREATED,
      data: slot,
    });
  },

  // GET /api/v1/vendor/return-slots?date= (vendor)
  async getReturnSlots(req, res) {
    const vendorUserId = req.user.id;
    const slots = await catalogService.getReturnSlots(vendorUserId, req.validated.query.date);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.RETURN_SLOTS_FETCHED,
      data: slots,
    });
  },

  // PUT /api/v1/vendor/late-fee-rule (vendor)
  async upsertLateFeeRule(req, res) {
    const vendorUserId = req.user.id;
    await catalogService.upsertLateFeeRule(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.LATE_FEE_RULE_UPDATED,
      data: null,
    });
  },

  // PUT /api/v1/vendor/cancellation-policy (vendor)
  async upsertCancellationPolicy(req, res) {
    const vendorUserId = req.user.id;
    await catalogService.upsertCancellationPolicy(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.CATALOG.CANCELLATION_POLICY_UPDATED,
      data: null,
    });
  },
};