import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../validations/validate.js';
import {
  categorySchema,
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsSchema,
  updateInventorySchema,
  createPricingSchema,
  pricingIdParamSchema,
  updatePricingSchema,
  createReturnSlotSchema,
  returnSlotsQuerySchema,
  lateFeeRuleSchema,
  cancellationPolicySchema,
} from '../validations/catalog.schema.js';
import { catalogController } from '../controllers/catalog.controller.js';

const router = express.Router();

// Public
router.get('/categories', catalogController.getCategories);
router.get('/products', validate(listProductsSchema), catalogController.listProducts);
router.get('/products/:id', validate(productIdParamSchema), catalogController.getProductById);
router.get('/products/:id/inventory', validate(productIdParamSchema), catalogController.getInventory);
router.get('/products/:id/pricing', validate(productIdParamSchema), catalogController.getPricing);

// Vendor only
router.post('/categories', authenticateUser, authorizeRoles('admin', 'vendor'), validate(categorySchema), catalogController.createCategory);

router.post('/products', authenticateUser, authorizeRoles('vendor'), validate(createProductSchema), catalogController.createProduct);
router.patch('/products/:id', authenticateUser, authorizeRoles('vendor'), validate(updateProductSchema), catalogController.updateProduct);
router.delete('/products/:id', authenticateUser, authorizeRoles('vendor'), validate(productIdParamSchema), catalogController.deleteProduct);

router.patch('/products/:id/inventory', authenticateUser, authorizeRoles('vendor'), validate(updateInventorySchema), catalogController.updateInventory);

router.post('/products/:id/pricing', authenticateUser, authorizeRoles('vendor'), validate(createPricingSchema), catalogController.createPricing);
router.patch('/pricing/:id', authenticateUser, authorizeRoles('vendor'), validate(updatePricingSchema), catalogController.updatePricing);
router.delete('/pricing/:id', authenticateUser, authorizeRoles('vendor'), validate(pricingIdParamSchema), catalogController.deletePricing);

router.post('/vendor/return-slots', authenticateUser, authorizeRoles('vendor'), validate(createReturnSlotSchema), catalogController.createReturnSlot);
router.get('/vendor/return-slots', authenticateUser, authorizeRoles('vendor'), validate(returnSlotsQuerySchema), catalogController.getReturnSlots);

router.put('/vendor/late-fee-rule', authenticateUser, authorizeRoles('vendor'), validate(lateFeeRuleSchema), catalogController.upsertLateFeeRule);
router.put('/vendor/cancellation-policy', authenticateUser, authorizeRoles('vendor'), validate(cancellationPolicySchema), catalogController.upsertCancellationPolicy);

export default router;