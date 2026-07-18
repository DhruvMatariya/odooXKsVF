import Stripe from 'stripe';
import pool from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';
import env from '../config/env.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

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

export const orderService = {
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

      const rentalIntent = await stripe.paymentIntents.create({
        amount: totalRentalFee,
        currency: 'inr',
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: order.id, type: 'RENTAL_FEE' },
      });

      const depositIntent = await stripe.paymentIntents.create({
        amount: totalDeposit,
        currency: 'inr',
        automatic_payment_methods: { enabled: true },
        metadata: { orderId: order.id, type: 'DEPOSIT' },
      });

      await client.query(
        `INSERT INTO payments (order_id, stripe_payment_intent_id, amount, type, status)
         VALUES ($1, $2, $3, 'RENTAL_FEE', 'pending'), ($1, $4, $5, 'DEPOSIT', 'pending')`,
        [order.id, rentalIntent.id, totalRentalFee, depositIntent.id, totalDeposit]
      );

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, NULL, 'PENDING_PAYMENT', 'CUSTOMER', $2, 'Order created, awaiting payment')`,
        [order.id, customerUserId]
      );

      const response = {
        order: toOrderDTO(order),
        stripeClientSecretRental: rentalIntent.client_secret,
        stripeClientSecretDeposit: depositIntent.client_secret,
      };

      if (idempotencyKey) {
        await client.query(
          `INSERT INTO idempotency_keys (key, response, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
          [idempotencyKey, JSON.stringify(response)]
        );
      }

      await client.query('COMMIT');
      return response;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
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

  async getOrderById(orderId, userId, userRole) {
    const result = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );
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

    const productResult = await pool.query(
      `SELECT id, name, thumbnail, brand FROM products WHERE id = $1`,
      [order.product_id]
    );

    const depositResult = await pool.query(
      `SELECT * FROM deposits WHERE order_id = $1`,
      [orderId]
    );

    const paymentsResult = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [orderId]
    );

    const eventsResult = await pool.query(
      `SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at`,
      [orderId]
    );

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

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );
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

  async handleStripePaymentSuccess(orderId, paymentIntentId, type) {
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

      await client.query(
        `UPDATE payments SET status = 'succeeded' WHERE order_id = $1 AND stripe_payment_intent_id = $2`,
        [orderId, paymentIntentId]
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
          `INSERT INTO deposits (order_id, amount_held, status, method) VALUES ($1, $2, 'HELD', 'STRIPE')`,
          [orderId, depositAmount]
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

  async handleStripeRefund(orderId, paymentIntentId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE payments SET status = 'refunded' WHERE order_id = $1 AND stripe_payment_intent_id = $2`,
        [orderId, paymentIntentId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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

      await client.query(
        `UPDATE orders SET status = 'DISPATCHED', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );

      await client.query(
        `INSERT INTO order_events (order_id, from_status, to_status, actor_role, actor_user_id, note)
         VALUES ($1, 'CONFIRMED', 'DISPATCHED', 'VENDOR', $2, 'Order dispatched')`,
        [orderId, vendorUserId]
      );

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
      } else {
        const isRefund = data.resolution === 'REFUND';

        if (isRefund) {
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
        }
      }

      await client.query('COMMIT');
      return toOrderDTO({ ...order, status: data.decision === 'ACCEPT' ? 'HANDED_OVER' : (data.resolution === 'REFUND' ? 'REJECTED_AT_DELIVERY' : 'REPLACEMENT_REQUESTED') });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err instanceof ApiError) throw err;
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, MESSAGES.SERVER.INTERNAL_ERROR);
    } finally {
      client.release();
    }
  },
};