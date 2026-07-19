import { orderService } from '../services/order.service.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';
import env from '../config/env.js';

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
    productName: order.productName,
    thumbnail: order.thumbnail,
    depositAmount: order.depositAmount,
    customerEmail: order.customerEmail,
  };
}

function toQuotationDTO(row) {
  return {
    id: row.id,
    vendorUserId: row.vendor_user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerUserId: row.customer_user_id,
    productId: row.product_id,
    pricingId: row.pricing_id,
    quantity: row.quantity,
    rentalPeriodStart: row.rental_period_start,
    rentalPeriodEnd: row.rental_period_end,
    deliveryType: row.delivery_type,
    quotedAmount: row.quoted_amount,
    status: row.status,
    validUntil: row.valid_until,
    orderId: row.order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

function formatCreateOrderResponse(response) {
  const base = {
    order: toOrderResponseDTO(response.order),
  };
  
  if (env.PAYMENT_PROVIDER === 'razorpay') {
    return {
      ...base,
      razorpayOrderIdRental: response.razorpayOrderIdRental,
      razorpayOrderIdDeposit: response.razorpayOrderIdDeposit,
      razorpayKeyId: response.razorpayKeyId,
    };
  } else {
    return {
      ...base,
      stripeClientSecretRental: response.stripeClientSecretRental,
      stripeClientSecretDeposit: response.stripeClientSecretDeposit,
    };
  }
}

export const orderController = {
  async createOrder(req, res) {
    const customerUserId = req.user.id;
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const response = await orderService.createOrder(customerUserId, req.validated.body, idempotencyKey);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_CREATED,
      data: formatCreateOrderResponse(response),
    });
  },

  async createVendorOrder(req, res) {
    const vendorUserId = req.user.id;
    const order = await orderService.createVendorOrder(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_CREATED,
      data: toOrderResponseDTO(order),
    });
  },

  async getOrderById(req, res) {
    const order = await orderService.getOrderById(req.validated.params.id, req.user.id, req.user.role);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.ORDERS.ORDER_FETCHED,
      data: toOrderDetailDTO(order),
    });
  },

  async listOrders(req, res) {
    const result = await orderService.listOrders(req.user.id, req.user.role, req.validated.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data.map(toOrderResponseDTO),
      meta: result.meta,
    });
  },

  async dispatchOrder(req, res) {
    const vendorUserId = req.user.id;
    const order = await orderService.dispatchOrder(req.validated.params.id, vendorUserId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order dispatched',
      data: toOrderResponseDTO(order),
    });
  },

  async confirmDelivery(req, res) {
    const customerUserId = req.user.id;
    const order = await orderService.confirmDelivery(req.validated.params.id, customerUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Delivery confirmed',
      data: toOrderResponseDTO(order),
    });
  },

  async resolveReplacement(req, res) {
    const vendorUserId = req.user.id;
    const result = await orderService.resolveReplacement(req.validated.params.id, vendorUserId, req.validated.body.resolution);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: result.message || 'Replacement resolved',
      data: toOrderResponseDTO(result.order),
    });
  },

  async scheduleReturnSlot(req, res) {
    const customerUserId = req.user.id;
    const order = await orderService.scheduleReturnSlot(req.validated.params.id, customerUserId, req.validated.body.returnSlotId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Return slot scheduled',
      data: toOrderResponseDTO(order),
    });
  },

  async markReturned(req, res) {
    const vendorUserId = req.user.id;
    const order = await orderService.markReturned(req.validated.params.id, vendorUserId, req.validated.body.actualReturnTime);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order marked as returned',
      data: toOrderResponseDTO(order),
    });
  },

  async inspectOrder(req, res) {
    const vendorUserId = req.user.id;
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

  async cancelOrder(req, res) {
    const userId = req.user.id;
    const role = req.user.role;
    const idempotencyKey = req.headers['idempotency-key'] || null;
    const result = await orderService.cancelOrder(req.validated.params.id, userId, role, idempotencyKey);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Order cancelled',
      data: {
        order: toOrderResponseDTO(result.order),
        refundBreakdown: result.refundBreakdown,
      },
    });
  },

  async reportIssue(req, res) {
    const customerUserId = req.user.id;
    const order = await orderService.reportIssue(req.validated.params.id, customerUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Issue reported, dispute opened',
      data: toOrderResponseDTO(order),
    });
  },

  async resolveDispute(req, res) {
    const vendorUserId = req.user.id;
    const order = await orderService.resolveDispute(req.validated.params.id, vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Dispute resolved',
      data: toOrderResponseDTO(order),
    });
  },

  async retryPayment(req, res) {
    const customerUserId = req.user.id;
    const response = await orderService.retryPayment(req.validated.params.id, customerUserId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment retry initiated',
      data: {
        order: toOrderResponseDTO(response.order),
        ...(env.PAYMENT_PROVIDER === 'razorpay'
          ? {
              razorpayOrderIdRental: response.razorpayOrderIdRental,
              razorpayOrderIdDeposit: response.razorpayOrderIdDeposit,
              razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            }
          : {
              stripeClientSecretRental: response.stripeClientSecretRental,
              stripeClientSecretDeposit: response.stripeClientSecretDeposit,
            }),
      },
    });
  },

  async verifyPayment(req, res) {
    const customerUserId = req.user.id;
    const { provider, ...paymentData } = req.validated.body;
    
    const order = await orderService.verifyPayment(req.validated.params.id, customerUserId, provider, paymentData);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Payment verified',
      data: toOrderDetailDTO(order),
    });
  },

  // Quotation endpoints
  async createQuotation(req, res) {
    const vendorUserId = req.user.id;
    const quotation = await orderService.createQuotation(vendorUserId, req.validated.body);
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Quotation created',
      data: toQuotationDTO(quotation),
    });
  },

  async listQuotations(req, res) {
    const vendorUserId = req.user.id;
    const result = await orderService.listQuotations(vendorUserId, req.validated.query);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result.data.map(toQuotationDTO),
      meta: result.meta,
    });
  },

  async getQuotationById(req, res) {
    const vendorUserId = req.user.id;
    const quotation = await orderService.getQuotationById(req.validated.params.id, vendorUserId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Quotation fetched',
      data: toQuotationDTO(quotation),
    });
  },

  async updateQuotation(req, res) {
    const vendorUserId = req.user.id;
    const quotation = await orderService.updateQuotation(vendorUserId, req.validated.params.id, req.validated.body);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Quotation updated',
      data: toQuotationDTO(quotation),
    });
  },

  async declineQuotation(req, res) {
    const vendorUserId = req.user.id;
    const quotation = await orderService.declineQuotation(vendorUserId, req.validated.params.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Quotation declined',
      data: toQuotationDTO(quotation),
    });
  },

  async confirmQuotation(req, res) {
    const vendorUserId = req.user.id;
    const order = await orderService.confirmQuotation(vendorUserId, req.validated.params.id);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Quotation confirmed, order created',
      data: toOrderResponseDTO(order),
    });
  },

  async getDashboardStats(req, res) {
    const vendorUserId = req.user.id;
    const stats = await orderService.getVendorDashboardStats(vendorUserId);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: stats,
    });
  },
};