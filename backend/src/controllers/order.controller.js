import { orderService } from '../services/order.service.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';

function toOrderResponseDTO(order) {
  return {
    id: order.id,
    customerUserId: order.customerUserId,
    vendorUserId: order.vendorUserId,
    productId: order.productId,
    pricingId: order.pricingId,
    quantity: order.quantity,
    channel: order.channel,
    status: order.status,
    deliveryType: order.deliveryType,
    returnSlotId: order.returnSlotId,
    rentalPeriodStart: order.rentalPeriodStart,
    rentalPeriodEnd: order.rentalPeriodEnd,
    actualHandoverTime: order.actualHandoverTime,
    actualReturnTime: order.actualReturnTime,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function toOrderDetailDTO(order) {
  return {
    id: order.id,
    customerUserId: order.customerUserId,
    vendorUserId: order.vendorUserId,
    productId: order.productId,
    pricingId: order.pricingId,
    quantity: order.quantity,
    channel: order.channel,
    status: order.status,
    deliveryType: order.deliveryType,
    returnSlotId: order.returnSlotId,
    rentalPeriodStart: order.rentalPeriodStart,
    rentalPeriodEnd: order.rentalPeriodEnd,
    actualHandoverTime: order.actualHandoverTime,
    actualReturnTime: order.actualReturnTime,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    product: order.product,
    deposit: order.deposit,
    payments: order.payments,
    orderEvents: order.orderEvents,
  };
}

export const orderController = {
  async createOrder(req, res) {
    const customerUserId = req.user.sub;
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const response = await orderService.createOrder(customerUserId, req.validated.body, idempotencyKey);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_CREATED,
      data: {
        order: toOrderResponseDTO(response.order),
        stripeClientSecretRental: response.stripeClientSecretRental,
        stripeClientSecretDeposit: response.stripeClientSecretDeposit,
      },
    });
  },

  async createVendorOrder(req, res) {
    const vendorUserId = req.user.sub;
    const order = await orderService.createVendorOrder(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_CREATED,
      data: toOrderResponseDTO(order),
    });
  },

  async getOrderById(req, res) {
    const order = await orderService.getOrderById(req.validated.params.id, req.user.sub, req.user.role);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_FETCHED,
      data: toOrderDetailDTO(order),
    });
  },

  async listOrders(req, res) {
    const result = await orderService.listOrders(req.user.sub, req.user.role, req.validated.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data.map(toOrderResponseDTO),
      meta: result.meta,
    });
  },

  async dispatchOrder(req, res) {
    const vendorUserId = req.user.sub;
    const order = await orderService.dispatchOrder(req.validated.params.id, vendorUserId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order dispatched',
      data: toOrderResponseDTO(order),
    });
  },

  async confirmDelivery(req, res) {
    const customerUserId = req.user.sub;
    const order = await orderService.confirmDelivery(req.validated.params.id, customerUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Delivery confirmed',
      data: toOrderResponseDTO(order),
    });
  },

  async resolveReplacement(req, res) {
    const vendorUserId = req.user.sub;
    const result = await orderService.resolveReplacement(req.validated.params.id, vendorUserId, req.validated.body.resolution);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message || 'Replacement resolved',
      data: toOrderResponseDTO(result.order),
    });
  },

  async scheduleReturnSlot(req, res) {
    const customerUserId = req.user.sub;
    const order = await orderService.scheduleReturnSlot(req.validated.params.id, customerUserId, req.validated.body.returnSlotId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Return slot scheduled',
      data: toOrderResponseDTO(order),
    });
  },

  async markReturned(req, res) {
    const vendorUserId = req.user.sub;
    const order = await orderService.markReturned(req.validated.params.id, vendorUserId, req.validated.body.actualReturnTime);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order marked as returned',
      data: toOrderResponseDTO(order),
    });
  },

  async inspectOrder(req, res) {
    const vendorUserId = req.user.sub;
    const result = await orderService.inspectOrder(req.validated.params.id, vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Inspection completed',
      data: {
        order: toOrderResponseDTO(result.order),
        inspectionReport: result.inspectionReport,
        latePenalty: result.latePenalty,
        totalDeduction: result.totalDeduction,
        refundAmount: result.refundAmount,
      },
    });
  },
};