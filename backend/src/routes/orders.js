import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../validations/validate.js';
import {
  createOrderSchema,
  orderIdParamSchema,
  confirmDeliverySchema,
  resolveReplacementSchema,
  returnSlotSchema,
  markReturnedSchema,
  inspectSchema,
  reportIssueSchema,
  resolveDisputeSchema,
  cancelOrderSchema,
  markPaidOfflineSchema,
  listOrdersQuerySchema,
  vendorOrderSchema,
} from '../validations/order.schema.js';
import {
  createOrder,
  createVendorOrder,
  getOrderById,
  listOrders,
  dispatchOrder,
  confirmDelivery,
  resolveReplacement,
  scheduleReturnSlot,
  markReturned,
  inspectOrder,
} from '../controllers/order.controller.js';

const router = express.Router();

router.post('/orders', authenticateUser, authorizeRoles('customer'), validate(createOrderSchema), orderController.createOrder);
router.get('/orders', authenticateUser, validate(listOrdersQuerySchema), orderController.listOrders);
router.get('/orders/:id', authenticateUser, validate(orderIdParamSchema), orderController.getOrderById);

router.post('/vendor/orders', authenticateUser, authorizeRoles('vendor'), validate(vendorOrderSchema), orderController.createVendorOrder);
router.post('/orders/:id/dispatch', authenticateUser, authorizeRoles('vendor'), validate(orderIdParamSchema), orderController.dispatchOrder);
router.post('/orders/:id/confirm-delivery', authenticateUser, authorizeRoles('customer'), validate(confirmDeliverySchema), orderController.confirmDelivery);

router.post('/orders/:id/resolve-replacement', authenticateUser, authorizeRoles('vendor'), validate(resolveReplacementSchema), orderController.resolveReplacement);

router.post('/orders/:id/return-slot', authenticateUser, authorizeRoles('customer'), validate(returnSlotSchema), scheduleReturnSlot);

router.post('/orders/:id/mark-returned', authenticateUser, authorizeRoles('vendor'), validate(markReturnedSchema), markReturned);

router.post('/orders/:id/inspect', authenticateUser, authorizeRoles('vendor'), validate(inspectSchema), inspectOrder);

router.post('/orders/:id/report-issue', authenticateUser, authorizeRoles('customer'), validate(reportIssueSchema), async (req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Report issue not implemented yet' } });
});

router.post('/orders/:id/resolve-dispute', authenticateUser, authorizeRoles('vendor'), validate(resolveDisputeSchema), async (req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Resolve dispute not implemented yet' } });
});

router.post('/orders/:id/cancel', authenticateUser, validate(cancelOrderSchema), async (req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Cancel order not implemented yet' } });
});

router.post('/orders/:id/mark-paid-offline', authenticateUser, authorizeRoles('vendor'), validate(markPaidOfflineSchema), async (req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Mark paid offline not implemented yet' } });
});

export default router;