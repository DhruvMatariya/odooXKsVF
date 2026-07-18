import pool from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';
import env from '../config/env.js';
import { notificationQueue, JOB_NAMES } from '../queues/notificationQueue.js';
import { calculateLateFee } from '../utils/lateFee.js';
import { calculateCancellationRefund } from '../utils/cancelRefund.js';
import { getPaymentProvider, PAYMENT_TYPES, PAYMENT_STATUSES } from '../payments/index.js';

const paymentProvider = getPaymentProvider();

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function toOrderDTO(row) {
  return {
    id: row.id,
    customerUserId: row.customer_user_id,
    vendorUserId: row.vendor_user_id,
    productId: row.product_id,
    pricingId: row.pricing_id,
    quantity: row.quantity,
    channel: row.channel,
    status: row.status,
    deliveryType: row.delivery_type,
    returnSlotId: row.return_slot_id,
    rentalPeriodStart: row.rental_period_start,
    rentalPeriodEnd: row.rental_period_end,
    actualHandoverTime: row.actual_handover_time,
    actualReturnTime: row.actual_return_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export const orderService = {
  // Phase A: Create order in DB only (no payment calls)
  async createOrder(customerUserId, data, idempotencyKey) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (idempotencyKey) {
        const existing = await client.query(
          `SELECT response FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()`,
          [idempotencyKey]
        );
        if (existing.rows.length > 0) {
          await client.query('COMMIT');
          return existing.rows[0].response;
        }
      }

      const productResult = await client.query(
        `SELECT p.id, p.vendor_user_id, p.status, p.category_id,
                i.available, i.reserved, i.rented, i.maintenance,
                pp.price, pp.deposit, pp.period, pp.duration
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         JOIN product_pricing pp ON pp.product_id = p.id AND pp.id = $1
         WHERE p.id = $2 AND p.is_deleted = false
         FOR SHARE`,
        [data.pricingId, data.productId]
      );

      if (productResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }

      const product = productResult.rows[0];

      if (product.status !== 'ACTIVE') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.PRODUCT_NOT_ACTIVE, 'PRODUCT_NOT_ACTIVE');
      }

      if (product.available < data.quantity) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVENTORY_INSUFFICIENT, 'INVENTORY_INSUFFICIENT');
      }

      const rentalStart = new Date(data.rentalPeriodStart);
      const rentalEnd = new Date(data.rentalPeriodEnd);
      if (rentalStart <= new Date()) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.ORDERS.RENTAL_PERIOD_INVALID, 'RENTAL_PERIOD_INVALID');
      }

      const totalRentalFee = product.price * data.quantity;
      const totalDeposit = product.deposit * data.quantity;

      const orderResult = await client.query(
        `INSERT INTO orders (customer_user_id, vendor_user_id, product_id, pricing_id, quantity, channel, delivery_type, rental_period_start, rental_period_end, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING_PAYMENT')
         RETURNING *`,
        [customerUserId, product.vendor_user_id, data.productId, data.pricingId, data.quantity, data.channel, data.deliveryType, rentalStart, rentalEnd]
      );

      const order = orderResult.rows[0];

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, NULL, 'PENDING_PAYMENT', 'CUSTOMER', $2, 'Order created, awaiting payment')`,
        [order.id, customerUserId]
      );

      // Phase A complete - order exists in DB with PENDING_PAYMENT
      await client.query('COMMIT');
      client.release();

      // Phase B: Initiate payment (outside transaction)
      return await this.initiatePayment(order, customerUserId, totalRentalFee, totalDeposit, idempotencyKey);
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    }
  },

  // Phase B: Initiate payment after order is persisted
  async initiatePayment(order, customerUserId, totalRentalFee, totalDeposit, idempotencyKey) {
    try {
      const rentalPayment = await paymentProvider.createRentalFeePayment({
        amount: totalRentalFee,
        currency: 'INR',
        orderId: order.id,
        metadata: { orderId: order.id, type: PAYMENT_TYPES.RENTAL_FEE },
      });

      const depositPayment = await paymentProvider.createDepositPayment({
        amount: totalDeposit,
        currency: 'INR',
        orderId: order.id,
        metadata: { orderId: order.id, type: PAYMENT_TYPES.DEPOSIT },
      });

      const provider = env.PAYMENT_PROVIDER?.toLowerCase();
      const rentalProviderId = rentalPayment.id;
      const depositProviderId = depositPayment.id;

      await pool.query(
        `INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, type, status)
         VALUES ($1, $2, $3, $4, $5, 'RENTAL_FEE', 'pending'), ($1, $2, $6, $7, $8, 'DEPOSIT', 'pending')`,
        [order.id, env.PAYMENT_PROVIDER, rentalProviderId, null, totalRentalFee, depositProviderId, null, totalDeposit]
      );

      await pool.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, NULL, 'PENDING_PAYMENT', 'CUSTOMER', $2, 'Order created, awaiting payment')`,
        [order.id, order.customer_user_id]
      );

      const response = {
        order: toOrderDTO({ ...order }),
        ...(env.PAYMENT_PROVIDER === 'razorpay'
          ? {
              razorpayOrderIdRental: rentalPayment.id,
              razorpayOrderIdDeposit: depositPayment.id,
              razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            }
          : {
              stripeClientSecretRental: rentalPayment.clientSecret,
              stripeClientSecretDeposit: depositPayment.clientSecret,
            }),
      };

      if (idempotencyKey) {
        await pool.query(
          `INSERT INTO idempotency_keys (key, response, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
          [idempotencyKey, JSON.stringify(response)]
        );
      }

      return response;
    } catch (err) {
      // Payment initiation failed - update order to PAYMENT_FAILED
      await this.handlePaymentInitiationFailure(order.id, err);
      throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Payment initiation failed: ${err.message}`, 'PAYMENT_INITIATION_FAILED');
    }
  },

  async handlePaymentInitiationFailure(orderId, error) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE orders SET status = 'PAYMENT_FAILED', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );

      await client.query(
        `INSERT INTO payments (order_id, provider, provider_order_id, amount, type, status, error_message)
         VALUES ($1, $2, $3, $4, 'RENTAL_FEE', 'failed', $5), ($1, $2, $6, $7, 'DEPOSIT', 'failed', $5)`,
        [orderId, env.PAYMENT_PROVIDER, 'unknown', 0, error.message, 'unknown', 0]
      );

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'PENDING_PAYMENT', 'PAYMENT_FAILED', 'SYSTEM', NULL, $2)`,
        [orderId, `Payment initiation failed: ${error.message}`]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Failed to record payment failure:', err);
    } finally {
      client.release();
    }
  },

  // Retry payment for PAYMENT_FAILED orders
  async retryPayment(orderId, customerUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2 FOR UPDATE`,
        [orderId, customerUserId]
      );

      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }

      const order = orderResult.rows[0];

      if (order.status !== 'PAYMENT_FAILED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      const rentalStart = new Date(order.rental_period_start);
      if (rentalStart <= new Date()) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.ORDERS.RENTAL_PERIOD_INVALID, 'RENTAL_PERIOD_INVALID');
      }

      const invResult = await client.query(
        `SELECT available FROM inventory WHERE product_id = $1 FOR SHARE`,
        [order.product_id]
      );
      if (invResult.rows.length === 0 || invResult.rows[0].available < order.quantity) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVENTORY_INSUFFICIENT, 'INVENTORY_INSUFFICIENT');
      }

      const pricingResult = await client.query(
        `SELECT price, deposit FROM product_pricing WHERE id = $1`,
        [order.pricing_id]
      );
      const pricing = pricingResult.rows[0];
      const totalRentalFee = pricing.price * order.quantity;
      const totalDeposit = pricing.deposit * order.quantity;

      await client.query('COMMIT');
      client.release();

      return await this.initiatePayment(order, customerUserId, totalRentalFee, totalDeposit, null);
    } catch (err) {
      await client.query('ROLLBACK');
      client.release();
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    }
  },

  async createVendorOrder(vendorUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const customerResult = await client.query(
        `SELECT id FROM users WHERE email = $1 AND role = 'customer'`,
        [data.customerEmail]
      );
      if (customerResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Customer not found');
      }
      const customerUserId = customerResult.rows[0].id;

      const productResult = await client.query(
        `SELECT p.id, p.vendor_user_id, p.status, i.available, pp.price, pp.deposit
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         JOIN product_pricing pp ON pp.product_id = p.id AND pp.id = $1
         WHERE p.id = $2 AND p.is_deleted = false
         FOR SHARE`,
        [data.pricingId, data.productId]
      );

      if (productResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }

      const product = productResult.rows[0];

      if (product.vendor_user_id !== vendorUserId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      if (product.status !== 'ACTIVE') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.PRODUCT_NOT_ACTIVE, 'PRODUCT_NOT_ACTIVE');
      }

      if (product.available < data.quantity) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVENTORY_INSUFFICIENT, 'INVENTORY_INSUFFICIENT');
      }

      const rentalStart = new Date(data.rentalPeriodStart);
      const rentalEnd = new Date(data.rentalPeriodEnd);
      if (rentalStart <= new Date()) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.ORDERS.RENTAL_PERIOD_INVALID, 'RENTAL_PERIOD_INVALID');
      }

      const orderResult = await client.query(
        `INSERT INTO orders (customer_user_id, vendor_user_id, product_id, pricing_id, quantity, channel, delivery_type, rental_period_start, rental_period_end, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED')
         RETURNING *`,
        [customerUserId, vendorUserId, data.productId, data.pricingId, data.quantity, data.channel, data.deliveryType, rentalStart, rentalEnd]
      );

      const order = orderResult.rows[0];

      await client.query(
        `UPDATE inventory SET available = available - $1, reserved = reserved + $1 WHERE product_id = $2`,
        [data.quantity, data.productId]
      );

      const totalDeposit = product.deposit * data.quantity;
      await client.query(
        `INSERT INTO deposits (order_id, amount_held, status, method) VALUES ($1, $2, 'HELD', 'OFFLINE')`,
        [order.id, totalDeposit]
      );

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, NULL, 'CONFIRMED', 'VENDOR', $2, 'Offline order created and marked paid')`,
        [order.id, vendorUserId]
      );

      await client.query('COMMIT');
      return toOrderDTO(order);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async handlePaymentSuccess(orderId, providerPaymentId, type) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'PENDING_PAYMENT') {
        await client.query('COMMIT');
        return { alreadyProcessed: true };
      }

      const provider = env.PAYMENT_PROVIDER?.toLowerCase();
      const idColumn = provider === 'razorpay' ? 'provider_payment_id' : 'stripe_payment_intent_id';
      
      await client.query(
        `UPDATE payments SET status = 'succeeded', ${idColumn} = $2 WHERE order_id = $1 AND (provider_order_id = $3 OR provider_payment_id = $3)`,
        [orderId, providerPaymentId, providerPaymentId]
      );

      const paymentsResult = await client.query(
        `SELECT * FROM payments WHERE order_id = $1`,
        [orderId]
      );
      const allSucceeded = paymentsResult.rows.every(p => p.status === 'succeeded');

      if (allSucceeded) {
        await client.query(
          `UPDATE orders SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`,
          [orderId]
        );

        const pricingResult = await client.query(
          `SELECT deposit FROM product_pricing WHERE id = $1`,
          [order.pricing_id]
        );
        const depositAmount = pricingResult.rows[0].deposit * order.quantity;

        await client.query(
          `INSERT INTO deposits (order_id, amount_held, status, method) VALUES ($1, $2, 'HELD', $3)`,
          [orderId, depositAmount, env.PAYMENT_PROVIDER.toUpperCase()]
        );

        await client.query(
          `UPDATE inventory SET available = available - $1, reserved = reserved + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );

        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'PENDING_PAYMENT', 'CONFIRMED', 'SYSTEM', NULL, 'Both rental fee and deposit payments succeeded')`,
          [orderId]
        );
      }

      await client.query('COMMIT');
      return { order: await this.getOrderById(orderId, order.customer_user_id, 'customer') };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async handleRefund(orderId, providerPaymentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const provider = env.PAYMENT_PROVIDER?.toLowerCase();
      const idColumn = provider === 'razorpay' ? 'provider_payment_id' : 'stripe_payment_intent_id';
      
      await client.query(
        `UPDATE payments SET status = 'refunded' WHERE order_id = $1 AND ${idColumn} = $2`,
        [orderId, providerPaymentId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getOrderById(orderId, userId, userRole) {
    const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    if (result.rows.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
    }
    const order = result.rows[0];

    if (userRole === 'customer' && order.customer_user_id !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
    }
    if (userRole === 'vendor' && order.vendor_user_id !== userId) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
    }

    const productResult = await pool.query(`SELECT id, name, thumbnail, brand FROM products WHERE id = $1`, [order.product_id]);
    const depositResult = await pool.query(`SELECT * FROM deposits WHERE order_id = $1`, [orderId]);
    const paymentsResult = await pool.query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
    const eventsResult = await pool.query(`SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at`, [orderId]);

    return {
      ...toOrderDTO(order),
      product: productResult.rows[0] || null,
      deposit: depositResult.rows[0] || null,
      payments: paymentsResult.rows,
      orderEvents: eventsResult.rows,
    };
  },

  async listOrders(userId, userRole, query) {
    const { status, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [userId];
    let paramIndex = 2;

    if (userRole === 'customer') {
      whereClause = 'WHERE customer_user_id = $1';
    } else {
      whereClause = 'WHERE vendor_user_id = $1';
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const ordersResult = await pool.query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      data: ordersResult.rows.map(toOrderDTO),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async dispatchOrder(orderId, vendorUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [orderId, vendorUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'CONFIRMED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      await client.query(`UPDATE orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = $1`, [orderId]);

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'CONFIRMED', 'DISPATCHED', 'VENDOR', $2, 'Order dispatched')`,
        [orderId, vendorUserId]
      );

      await notificationQueue.add(JOB_NAMES.DISPATCH_NOTIFICATION_EMAIL, { orderId, vendorUserId });

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: 'DISPATCHED' });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async confirmDelivery(orderId, customerUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2 FOR UPDATE`,
        [orderId, customerUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'DISPATCHED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      if (data.decision === 'ACCEPT') {
        await client.query(
          `UPDATE orders SET status = 'HANDED_OVER', actual_handover_time = NOW(), updated_at = NOW() WHERE id = $1`,
          [orderId]
        );

        await client.query(
          `UPDATE inventory SET reserved = reserved - $1, rented = rented + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );

        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'DISPATCHED', 'HANDED_OVER', 'CUSTOMER', $2, 'Customer accepted delivery')`,
          [orderId, customerUserId]
        );

        await notificationQueue.add(JOB_NAMES.HANDOVER_CONFIRMED_EMAIL, { orderId, customerUserId });

        await client.query('COMMIT');
        return toOrderDTO({ ...order, status: 'HANDED_OVER', actual_handover_time: new Date() });
      } else {
        const isRefund = data.resolution === 'REFUND';

        if (isRefund) {
          const paymentsResult = await client.query(
            `SELECT provider_payment_id, type FROM payments WHERE order_id = $1`,
            [orderId]
          );

          for (const payment of paymentsResult.rows) {
            try {
              await paymentProvider.refundPayment({
                paymentId: payment.provider_payment_id,
                amount: payment.amount,
                reason: 'requested_by_customer',
              });
            } catch (stripeErr) {
              await client.query('ROLLBACK');
              throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for ${payment.type}: ${stripeErr.message}`, 'PAYMENT_FAILED');
            }
          }

          await client.query(`UPDATE payments SET status = 'refunded' WHERE order_id = $1`, [orderId]);

          await client.query(
            `UPDATE orders SET status = 'REJECTED_AT_DELIVERY', updated_at = NOW() WHERE id = $1`,
            [orderId]
          );

          await client.query(
            `UPDATE inventory SET reserved = reserved - $1, available = available + $1 WHERE product_id = $2`,
            [order.quantity, order.product_id]
          );

          await client.query(
            `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
             VALUES ($1, 'DISPATCHED', 'REJECTED_AT_DELIVERY', 'CUSTOMER', $2, $3)`,
            [orderId, customerUserId, `Customer rejected delivery: ${data.reason}`]
          );

          await notificationQueue.add(JOB_NAMES.DELIVERY_REJECTED_REFUND_EMAIL, { orderId, customerUserId, reason: data.reason });

          await client.query('COMMIT');
          return toOrderDTO({ ...order, status: 'REJECTED_AT_DELIVERY' });
        } else {
          await client.query(
            `UPDATE orders SET status = 'REPLACEMENT_REQUESTED', updated_at = NOW() WHERE id = $1`,
            [orderId]
          );

          await client.query(
            `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
             VALUES ($1, 'DISPATCHED', 'REPLACEMENT_REQUESTED', 'CUSTOMER', $2, $3)`,
            [orderId, customerUserId, `Customer requested replacement: ${data.reason}`]
          );

          await notificationQueue.add(JOB_NAMES.REPLACEMENT_REQUESTED_EMAIL, { orderId, vendorUserId: order.vendor_user_id, reason: data.reason });

          await client.query('COMMIT');
          return toOrderDTO({ ...order, status: 'REPLACEMENT_REQUESTED' });
        }
      }
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async resolveReplacement(orderId, vendorUserId, resolution) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [orderId, vendorUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'REPLACEMENT_REQUESTED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      if (resolution === 'REDISPATCH') {
        const invResult = await client.query(
          `SELECT available FROM inventory WHERE product_id = $1 FOR SHARE`,
          [order.product_id]
        );
        if (invResult.rows.length === 0 || invResult.rows[0].available < order.quantity) {
          const paymentsResult = await client.query(
            `SELECT provider_payment_id, type FROM payments WHERE order_id = $1`,
            [orderId]
          );
          for (const payment of paymentsResult.rows) {
            try {
              await paymentProvider.refundPayment({
                paymentId: payment.provider_payment_id,
                amount: payment.amount,
                reason: 'requested_by_customer',
              });
            } catch (stripeErr) {
              await client.query('ROLLBACK');
              throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for ${payment.type}: ${stripeErr.message}`, 'PAYMENT_FAILED');
            }
          }
          await client.query(`UPDATE payments SET status = 'refunded' WHERE order_id = $1`, [orderId]);

          await client.query(
            `UPDATE orders SET status = 'REJECTED_AT_DELIVERY', updated_at = NOW() WHERE id = $1`,
            [orderId]
          );
          await client.query(
            `UPDATE inventory SET reserved = reserved - $1, available = available + $1 WHERE product_id = $2`,
            [order.quantity, order.product_id]
          );
          await client.query(
            `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
             VALUES ($1, 'REPLACEMENT_REQUESTED', 'REJECTED_AT_DELIVERY', 'VENDOR', $2, 'Insufficient inventory for replacement, forced refund')`,
            [orderId, vendorUserId]
          );

          await notificationQueue.add(JOB_NAMES.DELIVERY_REJECTED_REFUND_EMAIL, { orderId, vendorUserId, reason: 'Insufficient inventory for replacement' });

          await client.query('COMMIT');
          return { order: toOrderDTO({ ...order, status: 'REJECTED_AT_DELIVERY' }), message: 'Insufficient inventory for replacement; refund processed instead.' };
        }

        await client.query(`UPDATE orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = $1`, [orderId]);
        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'REPLACEMENT_REQUESTED', 'DISPATCHED', 'VENDOR', $2, 'Replacement dispatched')`,
          [orderId, vendorUserId]
        );

        await notificationQueue.add(JOB_NAMES.DISPATCH_NOTIFICATION_EMAIL, { orderId, vendorUserId });

        await client.query('COMMIT');
        return { order: toOrderDTO({ ...order, status: 'DISPATCHED' }), message: 'Replacement dispatched' };
      } else { // REFUND
        const paymentsResult = await client.query(`SELECT provider_payment_id, type FROM payments WHERE order_id = $1`, [orderId]);
        for (const payment of paymentsResult.rows) {
          try {
            await paymentProvider.refundPayment({
              paymentId: payment.provider_payment_id,
              amount: payment.amount,
              reason: 'requested_by_customer',
            });
          } catch (stripeErr) {
            await client.query('ROLLBACK');
            throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for ${payment.type}: ${stripeErr.message}`, 'PAYMENT_FAILED');
          }
        }
        await client.query(`UPDATE payments SET status = 'refunded' WHERE order_id = $1`, [orderId]);

        await client.query(`UPDATE orders SET status = 'REJECTED_AT_DELIVERY', updated_at = NOW() WHERE id = $1`, [orderId]);
        await client.query(`UPDATE inventory SET reserved = reserved - $1, available = available + $1 WHERE product_id = $2`, [order.quantity, order.product_id]);
        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'REPLACEMENT_REQUESTED', 'REJECTED_AT_DELIVERY', 'VENDOR', $2, 'Vendor chose refund for replacement')`,
          [orderId, vendorUserId]
        );

        await notificationQueue.add(JOB_NAMES.DELIVERY_REJECTED_REFUND_EMAIL, { orderId, vendorUserId, reason: 'Vendor chose refund for replacement' });

        await client.query('COMMIT');
        return { order: toOrderDTO({ ...order, status: 'REJECTED_AT_DELIVERY' }), message: 'Refund processed for replacement' };
      }
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async scheduleReturnSlot(orderId, customerUserId, returnSlotId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2 FOR UPDATE`,
        [orderId, customerUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'ACTIVE_RENTAL') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      const slotResult = await client.query(
        `SELECT * FROM return_slots WHERE id = $1 FOR UPDATE`,
        [returnSlotId]
      );
      if (slotResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Return slot not found', 'RETURN_SLOT_NOT_FOUND');
      }
      const slot = slotResult.rows[0];

      if (slot.vendor_user_id !== order.vendor_user_id) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Return slot does not belong to order vendor', 'FORBIDDEN');
      }

      if (slot.booked_count >= slot.capacity) {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Return slot is full', 'SLOT_FULL');
      }

      await client.query(`UPDATE return_slots SET booked_count = booked_count + 1 WHERE id = $1`, [returnSlotId]);

      await client.query(`UPDATE orders SET return_slot_id = $1, status = 'RETURN_SCHEDULED', updated_at = NOW() WHERE id = $2`, [returnSlotId, orderId]);

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'ACTIVE_RENTAL', 'RETURN_SCHEDULED', 'CUSTOMER', $2, 'Return slot scheduled')`,
        [orderId, customerUserId]
      );

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: 'RETURN_SCHEDULED', return_slot_id: returnSlotId });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async markReturned(orderId, vendorUserId, actualReturnTime) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [orderId, vendorUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'RETURN_SCHEDULED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      const returnTime = actualReturnTime ? new Date(actualReturnTime) : new Date();

      await client.query(
        `UPDATE orders SET status = 'RETURNED_PENDING_INSPECTION', actual_return_time = $1, updated_at = NOW() WHERE id = $2`,
        [returnTime, orderId]
      );

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'RETURN_SCHEDULED', 'RETURNED_PENDING_INSPECTION', 'VENDOR', $2, 'Item marked as returned')`,
        [orderId, vendorUserId]
      );

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: 'RETURNED_PENDING_INSPECTION', actual_return_time: returnTime });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async inspectOrder(orderId, vendorUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [orderId, vendorUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'RETURNED_PENDING_INSPECTION') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      const depositResult = await client.query(`SELECT * FROM deposits WHERE order_id = $1`, [orderId]);
      if (depositResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Deposit not found for order', 'DEPOSIT_NOT_FOUND');
      }
      const deposit = depositResult.rows[0];

      const lfrResult = await client.query(`SELECT * FROM late_fee_rules WHERE vendor_user_id = $1`, [order.vendor_user_id]);
      const lateFeeRule = lfrResult.rows[0] || { gracePeriodHours: 0, rateType: 'HOURLY', rateAmount: 0, maxCap: 0 };

      const { latePenalty, totalDeduction, refundAmount, lateByMinutes } = calculateLateFee(
        lateFeeRule,
        order.actual_return_time,
        order.rental_period_end,
        deposit.amount_held,
        data.damageDeductionAmount
      );

      await client.query(
        `INSERT INTO inspection_reports (order_id, condition_notes, damage_found, photos, late_by_minutes, penalty_amount, inspected_by, inspected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [orderId, data.conditionNotes ?? '', data.damageFound, JSON.stringify(data.photos ?? []), lateByMinutes, totalDeduction, vendorUserId]
      );

      const newDepositStatus = totalDeduction === 0 ? 'REFUNDED' : 'PARTIALLY_DEDUCTED';
      await client.query(
        `UPDATE deposits SET status = $1, deduction_amount = $2, refund_amount = $3, settled_at = NOW() WHERE order_id = $4`,
        [newDepositStatus, totalDeduction, refundAmount, orderId]
      );

      if (refundAmount > 0) {
        const paymentResult = await client.query(
          `SELECT provider_payment_id FROM payments WHERE order_id = $1 AND type = 'DEPOSIT'`,
          [orderId]
        );
        if (paymentResult.rows.length > 0) {
          const depositPi = paymentResult.rows[0].provider_payment_id;
          try {
            await paymentProvider.refundPayment({
              paymentId: depositPi,
              amount: refundAmount,
              reason: 'requested_by_customer',
            });
          } catch (stripeErr) {
            await client.query('ROLLBACK');
            throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for deposit: ${stripeErr.message}`, 'PAYMENT_FAILED');
          }
        }
      }

      if (data.damageFound) {
        await client.query(
          `UPDATE inventory SET rented = rented - $1, maintenance = maintenance + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );
      } else {
        await client.query(
          `UPDATE inventory SET rented = rented - $1, available = available + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );
      }

      await client.query(`UPDATE orders SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`, [orderId]);

      const note = `Inspection completed. Late by ${lateByMinutes} min (grace ${lateFeeRule.gracePeriodHours}h). Late penalty: ${latePenalty}. Damage deduction: ${data.damageDeductionAmount}. Total deduction: ${totalDeduction}. Refund: ${refundAmount}. Damage found: ${data.damageFound}.`;
      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'RETURNED_PENDING_INSPECTION', 'COMPLETED', 'VENDOR', $2, $3)`,
        [orderId, vendorUserId, note]
      );

      await notificationQueue.add(JOB_NAMES.INSPECTION_COMPLETE_EMAIL, { orderId, vendorUserId, totalDeduction, refundAmount });

      await client.query('COMMIT');

      const inspection = {
        damageFound: data.damageFound,
        conditionNotes: data.conditionNotes,
        photos: data.photos,
        damageDeductionAmount: data.damageDeductionAmount,
        lateByMinutes,
        latePenalty,
        totalDeduction,
        refundAmount,
      };
      return { order: toOrderDTO({ ...order, status: 'COMPLETED' }), inspection };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async cancelOrder(orderId, userId, userRole, idempotencyKey) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (idempotencyKey) {
        const existing = await client.query(
          `SELECT response FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()`,
          [idempotencyKey]
        );
        if (existing.rows.length > 0) {
          await client.query('COMMIT');
          return existing.rows[0].response;
        }
      }

      const orderResult = await client.query(`SELECT * FROM orders WHERE id = $1 FOR UPDATE`, [orderId]);
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (userRole === 'customer' && order.customer_user_id !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }
      if (userRole === 'vendor' && order.vendor_user_id !== userId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(order.status)) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      const cpResult = await client.query(
        `SELECT * FROM cancellation_policies WHERE vendor_user_id = $1`,
        [order.vendor_user_id]
      );
      const cancellationPolicy = cpResult.rows[0] || {
        full_refund_hours_before: 24,
        partial_refund_hours_before: 6,
        partial_refund_percent: 50,
      };

      const hoursUntilStart = (new Date(order.rental_period_start).getTime() - Date.now()) / 3_600_000;
      let refundPercent;
      if (hoursUntilStart >= cancellationPolicy.full_refund_hours_before) {
        refundPercent = 100;
      } else if (hoursUntilStart >= cancellationPolicy.partial_refund_hours_before) {
        refundPercent = cancellationPolicy.partial_refund_percent;
      } else {
        refundPercent = 0;
      }

      const paymentsResult = await client.query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
      const payments = paymentsResult.rows;

      let rentalPaid = 0;
      let depositPaid = 0;
      for (const p of payments) {
        if (p.status === 'succeeded') {
          if (p.type === 'RENTAL_FEE') rentalPaid += p.amount;
          else if (p.type === 'DEPOSIT') depositPaid += p.amount;
        }
      }

      const rentalRefund = Math.floor((rentalPaid * refundPercent) / 100);
      const depositRefund = depositPaid;
      const totalRefund = rentalRefund + depositRefund;

      if (order.status === 'CONFIRMED' && totalRefund > 0) {
        if (rentalRefund > 0) {
          const rentalPayment = payments.find(p => p.type === 'RENTAL_FEE' && p.status === 'succeeded');
          if (rentalPayment) {
            try {
              await paymentProvider.refundPayment({
                paymentId: rentalPayment.provider_payment_id,
                amount: rentalRefund,
                reason: 'requested_by_customer',
              });
            } catch (stripeErr) {
              await client.query('ROLLBACK');
              throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for rental fee: ${stripeErr.message}`, 'PAYMENT_FAILED');
            }
            await client.query(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [rentalPayment.id]);
          }
        }
        if (depositRefund > 0) {
          const depositPayment = payments.find(p => p.type === 'DEPOSIT' && p.status === 'succeeded');
          if (depositPayment) {
            try {
              await paymentProvider.refundPayment({
                paymentId: depositPayment.provider_payment_id,
                amount: depositRefund,
                reason: 'requested_by_customer',
              });
            } catch (stripeErr) {
              await client.query('ROLLBACK');
              throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed for deposit: ${stripeErr.message}`, 'PAYMENT_FAILED');
            }
            await client.query(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [depositPayment.id]);
          }
        }
      } else if (order.status === 'PENDING_PAYMENT') {
        for (const p of payments) {
          if (p.provider_payment_id) {
            try {
              await paymentProvider.cancelPayment(p.provider_payment_id);
            } catch (e) {
              // ignore cancel errors
            }
          }
        }
        await client.query(`UPDATE payments SET status = 'cancelled' WHERE order_id = $1`, [orderId]);
      }

      if (order.status === 'CONFIRMED') {
        await client.query(
          `UPDATE inventory SET reserved = reserved - $1, available = available + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );
      }

      if (depositPaid > 0) {
        await client.query(
          `UPDATE deposits SET status = 'REFUNDED', refund_amount = $1, settled_at = NOW() WHERE order_id = $2`,
          [depositRefund, orderId]
        );
      }

      await client.query(`UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [orderId]);

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, $2, 'CANCELLED', $3, $4, $5)`,
        [orderId, order.status, userRole.toUpperCase(), userId, `Order cancelled, refund ${refundPercent}% (${totalRefund} cents)`]
      );

      await notificationQueue.add(JOB_NAMES.ORDER_CANCELLED_EMAIL, { orderId, refundPercent, totalRefund });

      await client.query('COMMIT');

      const response = {
        order: toOrderDTO({ ...order, status: 'CANCELLED' }),
        refundBreakdown: {
          rentalFeeRefundCents: rentalRefund,
          depositRefundCents: depositRefund,
          totalRefundCents: totalRefund,
          refundPercent,
          reason: `Cancellation ${hoursUntilStart.toFixed(1)}h before start`,
        },
      };

      if (idempotencyKey) {
        await client.query(
          `INSERT INTO idempotency_keys (key, response, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
          [idempotencyKey, JSON.stringify(response)]
        );
      }

      return response;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async reportIssue(orderId, customerUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2 FOR UPDATE`,
        [orderId, customerUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (!['ACTIVE_RENTAL', 'HANDED_OVER'].includes(order.status)) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      if (order.status === 'HANDED_OVER' && order.actual_handover_time) {
        const hoursSince = (Date.now() - new Date(order.actual_handover_time).getTime()) / 3_600_000;
        if (hoursSince > 24) {
          throw new ApiError(HTTP_STATUS.CONFLICT, 'Issue report window expired', 'REPORT_WINDOW_EXPIRED');
        }
      }

      await client.query(`UPDATE orders SET status = 'DISPUTED', updated_at = NOW() WHERE id = $1`, [orderId]);

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, $2, 'DISPUTED', 'CUSTOMER', $3, $4)`,
        [orderId, order.status, customerUserId, `Issue reported: ${data.description}`]
      );

      await notificationQueue.add(JOB_NAMES.DISPUTE_REPORTED_EMAIL, { orderId, vendorUserId: order.vendor_user_id, description: data.description });

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: 'DISPUTED' });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async resolveDispute(orderId, vendorUserId, resolution, note) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [orderId, vendorUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'DISPUTED') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      if (resolution === 'ACCEPT') {
        const paymentsResult = await client.query(`SELECT * FROM payments WHERE order_id = $1 AND status = 'succeeded'`, [orderId]);
        for (const p of paymentsResult.rows) {
          try {
            await paymentProvider.refundPayment({
              paymentId: p.provider_payment_id,
              amount: p.amount,
              reason: 'requested_by_customer',
            });
          } catch (stripeErr) {
            await client.query('ROLLBACK');
            throw new ApiError(HTTP_STATUS.BAD_GATEWAY, `Refund failed: ${stripeErr.message}`, 'PAYMENT_FAILED');
          }
          await client.query(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [p.id]);
        }

        await client.query(
          `UPDATE inventory SET reserved = GREATEST(reserved - $1, 0), rented = GREATEST(rented - $1, 0), available = available + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );

        await client.query(`UPDATE deposits SET status = 'REFUNDED', refund_amount = amount_held, settled_at = NOW() WHERE order_id = $1`, [orderId]);

        await client.query(`UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [orderId]);

        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'DISPUTED', 'CANCELLED', 'VENDOR', $2, $3)`,
          [orderId, vendorUserId, `Dispute accepted: ${note}`]
        );

      } else {
        await client.query(`UPDATE orders SET status = 'ACTIVE_RENTAL', updated_at = NOW() WHERE id = $1`, [orderId]);

        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'DISPUTED', 'ACTIVE_RENTAL', 'VENDOR', $2, $3)`,
          [orderId, vendorUserId, `Dispute rejected: ${note}`]
        );
      }

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: resolution === 'ACCEPT' ? 'CANCELLED' : 'ACTIVE_RENTAL' });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async verifyPayment(orderId, customerUserId, provider, paymentData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2 FOR UPDATE`,
        [orderId, customerUserId]
      );
      if (orderResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'PENDING_PAYMENT') {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      let verificationResult;
      if (provider === 'stripe') {
        verificationResult = await paymentProvider.verifyPayment({
          paymentIntentIdRental: paymentData.paymentIntentIdRental,
          paymentIntentIdDeposit: paymentData.paymentIntentIdDeposit,
        });
      } else if (provider === 'razorpay') {
        // Verify both rental and deposit payments
        const rentalResult = await paymentProvider.verifyPayment({
          razorpayOrderId: paymentData.razorpayOrderIdRental,
          razorpayPaymentId: paymentData.razorpayPaymentIdRental,
          razorpaySignature: paymentData.razorpaySignatureRental,
        });
        const depositResult = await paymentProvider.verifyPayment({
          razorpayOrderId: paymentData.razorpayOrderIdDeposit,
          razorpayPaymentId: paymentData.razorpayPaymentIdDeposit,
          razorpaySignature: paymentData.razorpaySignatureDeposit,
        });
        verificationResult = { success: rentalResult.success && depositResult.success };
      } else {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid payment provider', 'INVALID_PROVIDER');
      }

      if (!verificationResult.success) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Payment verification failed', 'VERIFICATION_FAILED');
      }

      // Update payments status
      await client.query(`UPDATE payments SET status = 'succeeded' WHERE order_id = $1`, [orderId]);

      // Check if both payments succeeded
      const paymentsResult = await client.query(`SELECT * FROM payments WHERE order_id = $1`, [orderId]);
      const allSucceeded = paymentsResult.rows.every(p => p.status === 'succeeded');

      if (allSucceeded) {
        await client.query(`UPDATE orders SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`, [orderId]);

        const pricingResult = await client.query(`SELECT deposit FROM product_pricing WHERE id = $1`, [order.pricing_id]);
        const depositAmount = pricingResult.rows[0].deposit * order.quantity;

        await client.query(
          `INSERT INTO deposits (order_id, amount_held, status, method) VALUES ($1, $2, 'HELD', $3)`,
          [orderId, depositAmount, env.PAYMENT_PROVIDER.toUpperCase()]
        );

        await client.query(
          `UPDATE inventory SET available = available - $1, reserved = reserved + $1 WHERE product_id = $2`,
          [order.quantity, order.product_id]
        );

        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, 'PENDING_PAYMENT', 'CONFIRMED', 'SYSTEM', NULL, 'Both rental fee and deposit payments succeeded')`,
          [orderId]
        );
      }

      await client.query('COMMIT');
      return await this.getOrderById(orderId, customerUserId, 'customer');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  // Quotation methods
  async createQuotation(vendorUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify product belongs to vendor and get pricing
      const productResult = await client.query(
        `SELECT p.id, p.vendor_user_id, p.status, pp.price, pp.deposit
         FROM products p
         JOIN product_pricing pp ON pp.product_id = p.id AND pp.id = $1
         WHERE p.id = $2 AND p.is_deleted = false
         FOR SHARE`,
        [data.pricingId, data.productId]
      );

      if (productResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDERS.ORDER_NOT_FOUND, 'ORDER_NOT_FOUND');
      }

      const product = productResult.rows[0];

      if (product.vendor_user_id !== vendorUserId) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      // Determine status based on customerEmail
      const status = data.customerEmail ? 'SENT' : 'DRAFT';

      const quotationResult = await client.query(
        `INSERT INTO quotations (vendor_user_id, customer_name, customer_email, customer_user_id, product_id, pricing_id, quantity, rental_period_start, rental_period_end, delivery_type, quoted_amount, status, valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [vendorUserId, data.customerName, data.customerEmail, data.customerUserId, data.productId, data.pricingId, data.quantity, data.rentalPeriodStart, data.rentalPeriodEnd, data.deliveryType, data.quotedAmount, status, data.validUntil]
      );

      const quotation = quotationResult.rows[0];

      // Log warning if quoted amount differs significantly from product pricing
      const expectedAmount = product.price * data.quantity;
      const diffPercent = Math.abs(quotation.quoted_amount - expectedAmount) / expectedAmount * 100;
      if (diffPercent > 20) {
        await client.query(
          `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
           VALUES ($1, NULL, $2, 'VENDOR', $3, $4)`,
          [quotation.id, quotation.status, vendorUserId, `Quotation amount differs from standard pricing by ${diffPercent.toFixed(1)}%`]
        );
      }

      await client.query('COMMIT');
      return { ...quotation };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async getQuotations(vendorUserId, query) {
    const { status, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE vendor_user_id = $1';
    const params = [vendorUserId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM quotations ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const quotationsResult = await pool.query(
      `SELECT * FROM quotations ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      data: quotationsResult.rows.map(q => ({ ...q })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getQuotationById(vendorUserId, quotationId) {
    const result = await pool.query(
      `SELECT * FROM quotations WHERE id = $1 AND vendor_user_id = $2`,
      [quotationId, vendorUserId]
    );
    if (result.rows.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Quotation not found', 'QUOTATION_NOT_FOUND');
    }
    return { ...result.rows[0] };
  },

  async updateQuotation(vendorUserId, quotationId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quotationResult = await client.query(
        `SELECT * FROM quotations WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [quotationId, vendorUserId]
      );
      if (quotationResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Quotation not found', 'QUOTATION_NOT_FOUND');
      }
      const quotation = quotationResult.rows[0];

      if (!['DRAFT', 'SENT'].includes(quotation.status)) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      // Verify product belongs to vendor if productId is being updated
      if (data.productId || data.pricingId) {
        const productId = data.productId || quotation.product_id;
        const pricingId = data.pricingId || quotation.pricing_id;

        const productResult = await client.query(
          `SELECT p.vendor_user_id FROM products p JOIN product_pricing pp ON pp.product_id = p.id WHERE pp.id = $1 AND p.id = $2 AND p.is_deleted = false`,
          [pricingId, productId]
        );
        if (productResult.rows.length === 0 || productResult.rows[0].vendor_user_id !== vendorUserId) {
          throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.ORDERS.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
        }
      }

      const updates = [];
      const values = [quotationId];
      let idx = 2;
      const fields = ['customerName', 'customerEmail', 'customerUserId', 'productId', 'pricingId', 'quantity', 'rentalPeriodStart', 'rentalPeriodEnd', 'deliveryType', 'quotedAmount', 'validUntil'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          const col = field === 'customerName' ? 'customer_name' :
                      field === 'customerEmail' ? 'customer_email' :
                      field === 'customerUserId' ? 'customer_user_id' :
                      field === 'productId' ? 'product_id' :
                      field === 'pricingId' ? 'pricing_id' :
                      field === 'rentalPeriodStart' ? 'rental_period_start' :
                      field === 'rentalPeriodEnd' ? 'rental_period_end' :
                      field === 'deliveryType' ? 'delivery_type' :
                      field === 'quotedAmount' ? 'quoted_amount' :
                      field === 'validUntil' ? 'valid_until' : field;
          updates.push(`${col} = $${idx}`);
          values.push(data[field]);
          idx++;
        }
      }
      if (updates.length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No fields to update');
      }
      updates.push('updated_at = NOW()');

      await client.query(
        `UPDATE quotations SET ${updates.join(', ')} WHERE id = $1`,
        values
      );

      await client.query('COMMIT');

      const result = await pool.query(`SELECT * FROM quotations WHERE id = $1`, [quotationId]);
      return { ...result.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async declineQuotation(vendorUserId, quotationId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quotationResult = await client.query(
        `SELECT * FROM quotations WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [quotationId, vendorUserId]
      );
      if (quotationResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Quotation not found', 'QUOTATION_NOT_FOUND');
      }
      const quotation = quotationResult.rows[0];

      if (!['DRAFT', 'SENT'].includes(quotation.status)) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      await client.query(
        `UPDATE quotations SET status = 'DECLINED', updated_at = NOW() WHERE id = $1`,
        [quotationId]
      );

      await client.query('COMMIT');
      return { ...quotation, status: 'DECLINED' };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async confirmQuotation(vendorUserId, quotationId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const quotationResult = await client.query(
        `SELECT * FROM quotations WHERE id = $1 AND vendor_user_id = $2 FOR UPDATE`,
        [quotationId, vendorUserId]
      );
      if (quotationResult.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Quotation not found', 'QUOTATION_NOT_FOUND');
      }
      const quotation = quotationResult.rows[0];

      if (!['DRAFT', 'SENT'].includes(quotation.status)) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVALID_STATE_TRANSITION, 'INVALID_STATE_TRANSITION');
      }

      // Check if valid_until has passed
      if (quotation.valid_until && new Date(quotation.valid_until) < new Date()) {
        await client.query(`UPDATE quotations SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`, [quotationId]);
        await client.query('COMMIT');
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Quotation has expired', 'QUOTATION_EXPIRED');
      }

      // Check inventory availability (current stock, not when quoted)
      const invResult = await client.query(
        `SELECT available FROM inventory WHERE product_id = $1 FOR SHARE`,
        [quotation.product_id]
      );
      if (invResult.rows.length === 0 || invResult.rows[0].available < quotation.quantity) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.ORDERS.INVENTORY_INSUFFICIENT, 'INVENTORY_INSUFFICIENT');
      }

      // Create the order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_user_id, vendor_user_id, product_id, pricing_id, quantity, channel, delivery_type, rental_period_start, rental_period_end, status)
         VALUES ($1, $2, $3, $4, $5, 'OFFLINE', $6, $7, $8, 'CONFIRMED')
         RETURNING *`,
        [quotation.customer_user_id, quotation.vendor_user_id, quotation.product_id, quotation.pricing_id, quotation.quantity, quotation.delivery_type, quotation.rental_period_start, quotation.rental_period_end]
      );
      const order = orderResult.rows[0];

      // Update inventory: available -> reserved
      await client.query(
        `UPDATE inventory SET available = available - $1, reserved = reserved + $1 WHERE product_id = $2`,
        [quotation.quantity, quotation.product_id]
      );

      // Create deposits row (OFFLINE method)
      const pricingResult = await client.query(`SELECT deposit FROM product_pricing WHERE id = $1`, [quotation.pricing_id]);
      const depositAmount = pricingResult.rows[0].deposit * quotation.quantity;
      await client.query(
        `INSERT INTO deposits (order_id, amount_held, status, method) VALUES ($1, $2, 'HELD', 'OFFLINE')`,
        [order.id, depositAmount]
      );

      // Create payment records (OFFLINE, succeeded)
      await client.query(
        `INSERT INTO payments (order_id, provider, provider_order_id, provider_payment_id, amount, type, status)
         VALUES ($1, $2, $3, $4, $5, 'RENTAL_FEE', 'succeeded'), ($1, $2, $6, $7, $8, 'DEPOSIT', 'succeeded')`,
        [order.id, 'RAZORPAY', 'offline_rental_' + order.id, 'offline_rental_' + order.id, quotation.quoted_amount, 'offline_deposit_' + order.id, 'offline_deposit_' + order.id, depositAmount]
      );

      // Update quotation
      await client.query(
        `UPDATE quotations SET status = 'CONFIRMED', order_id = $1, updated_at = NOW() WHERE id = $2`,
        [order.id, quotationId]
      );

      // Order event
      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, NULL, 'CONFIRMED', 'VENDOR', $2, $3)`,
        [order.id, vendorUserId, `Converted from quotation ${quotationId}`]
      );

      await notificationQueue.add(JOB_NAMES.ORDER_CONFIRMED_EMAIL, { orderId: order.id, vendorUserId });

      await client.query('COMMIT');
      return await this.getOrderById(order.id, order.customer_user_id, 'customer');
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },

  async getVendorDashboardStats(vendorUserId) {
    const client = await pool.connect();
    try {
      // Revenue (sum of rental fees from completed orders)
      const revenueResult = await client.query(
        `SELECT COALESCE(SUM(p.amount), 0) as revenue
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.vendor_user_id = $1 AND p.type = 'RENTAL_FEE' AND p.status = 'succeeded'`,
        [vendorUserId]
      );

      // Active rentals (HANDED_OVER, ACTIVE_RENTAL)
      const activeRentalsResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1 AND status IN ('HANDED_OVER', 'ACTIVE_RENTAL')`,
        [vendorUserId]
      );

      // Due today (rental period ends today)
      const dueTodayResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1 AND status IN ('HANDED_OVER', 'ACTIVE_RENTAL') 
         AND DATE(rental_period_end) = CURRENT_DATE`,
        [vendorUserId]
      );

      // Overdue (rental period ended, not returned)
      const overdueResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1 AND status IN ('HANDED_OVER', 'ACTIVE_RENTAL') 
         AND rental_period_end < NOW()`,
        [vendorUserId]
      );

      // Upcoming pickups (confirmed, delivery type PICKUP, rental hasn't started)
      const upcomingPickupsResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1 AND status = 'CONFIRMED' 
         AND delivery_type = 'PICKUP' AND rental_period_start > NOW()`,
        [vendorUserId]
      );

      // New requests (pending payment or confirmed but not handed over)
      const newRequestsResult = await client.query(
        `SELECT COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1 AND status IN ('PENDING_PAYMENT', 'CONFIRMED')`,
        [vendorUserId]
      );

      // Revenue chart data (last 7 days)
      const revenueChartResult = await client.query(
        `SELECT DATE(p.created_at) as date, COALESCE(SUM(p.amount), 0) as revenue
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE o.vendor_user_id = $1 AND p.type = 'RENTAL_FEE' AND p.status = 'succeeded'
         AND p.created_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(p.created_at)
         ORDER BY date ASC`,
        [vendorUserId]
      );

      // Order status distribution
      const statusDistResult = await client.query(
        `SELECT status, COUNT(*) as count FROM orders 
         WHERE vendor_user_id = $1
         GROUP BY status`,
        [vendorUserId]
      );

      return {
        revenue: parseInt(revenueResult.rows[0].revenue) || 0,
        activeRentals: parseInt(activeRentalsResult.rows[0].count) || 0,
        dueToday: parseInt(dueTodayResult.rows[0].count) || 0,
        overdue: parseInt(overdueResult.rows[0].count) || 0,
        upcomingPickups: parseInt(upcomingPickupsResult.rows[0].count) || 0,
        newRequests: parseInt(newRequestsResult.rows[0].count) || 0,
        revenueChart: revenueChartResult.rows.map(r => ({
          name: new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }),
          revenue: parseInt(r.revenue) || 0,
        })),
        statusDistribution: statusDistResult.rows.map(r => ({
          name: r.status,
          count: parseInt(r.count) || 0,
        })),
      };
    } finally {
      client.release();
    }
  },
};