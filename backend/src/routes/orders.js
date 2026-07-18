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
  retryPaymentSchema,
  verifyPaymentSchema,
  createQuotationSchema,
  quotationIdParamSchema,
  updateQuotationSchema,
  confirmQuotationSchema,
  declineQuotationSchema,
  listQuotationsQuerySchema,
} from '../validations/order.schema.js';
import { orderController } from '../controllers/order.controller.js';

const router = express.Router();

// Quotation endpoints (vendor only)
router.post('/vendor/quotations', authenticateUser, authorizeRoles('vendor'), validate(createQuotationSchema), orderController.createQuotation);
router.get('/vendor/quotations', authenticateUser, authorizeRoles('vendor'), validate(listQuotationsQuerySchema), orderController.listQuotations);
router.get('/vendor/quotations/:id', authenticateUser, authorizeRoles('vendor'), validate(quotationIdParamSchema), orderController.getQuotationById);
router.patch('/vendor/quotations/:id', authenticateUser, authorizeRoles('vendor'), validate(updateQuotationSchema), orderController.updateQuotation);
router.post('/vendor/quotations/:id/decline', authenticateUser, authorizeRoles('vendor'), validate(declineQuotationSchema), orderController.declineQuotation);
router.post('/vendor/quotations/:id/confirm', authenticateUser, authorizeRoles('vendor'), validate(confirmQuotationSchema), orderController.confirmQuotation);

// Order endpoints
router.post('/orders', authenticateUser, authorizeRoles('customer'), validate(createOrderSchema), orderController.createOrder);
router.get('/orders', authenticateUser, validate(listOrdersQuerySchema), orderController.listOrders);
router.get('/orders/:id', authenticateUser, validate(orderIdParamSchema), orderController.getOrderById);

router.post('/vendor/orders', authenticateUser, authorizeRoles('vendor'), validate(vendorOrderSchema), async (req, res) => {
  res.status(410).json({
    success: false,
    error: { code: 'GONE', message: 'This endpoint is deprecated. Use POST /api/v1/vendor/quotations to create a quotation, then POST /api/v1/vendor/quotations/:id/confirm to convert it to an order.' }
  });
});
router.post('/orders/:id/dispatch', authenticateUser, authorizeRoles('vendor'), validate(orderIdParamSchema), orderController.dispatchOrder);
router.post('/orders/:id/confirm-delivery', authenticateUser, authorizeRoles('customer'), validate(confirmDeliverySchema), orderController.confirmDelivery);

router.post('/orders/:id/resolve-replacement', authenticateUser, authorizeRoles('vendor'), validate(resolveReplacementSchema), orderController.resolveReplacement);

router.post('/orders/:id/return-slot', authenticateUser, authorizeRoles('customer'), validate(returnSlotSchema), orderController.scheduleReturnSlot);

router.post('/orders/:id/mark-returned', authenticateUser, authorizeRoles('vendor'), validate(markReturnedSchema), orderController.markReturned);

router.post('/orders/:id/inspect', authenticateUser, authorizeRoles('vendor'), validate(inspectSchema), orderController.inspectOrder);

router.post('/orders/:id/report-issue', authenticateUser, authorizeRoles('customer'), validate(reportIssueSchema), orderController.reportIssue);

router.post('/orders/:id/resolve-dispute', authenticateUser, authorizeRoles('vendor'), validate(resolveDisputeSchema), orderController.resolveDispute);

router.post('/orders/:id/cancel', authenticateUser, validate(cancelOrderSchema), orderController.cancelOrder);

router.post('/orders/:id/retry-payment', authenticateUser, authorizeRoles('customer'), validate(retryPaymentSchema), orderController.retryPayment);
router.post('/orders/:id/verify-payment', authenticateUser, authorizeRoles('customer'), validate(verifyPaymentSchema), orderController.verifyPayment);

router.post('/orders/:id/mark-paid-offline', authenticateUser, authorizeRoles('vendor'), validate(markPaidOfflineSchema), async (req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Mark paid offline not implemented yet' } });
});

export default router;