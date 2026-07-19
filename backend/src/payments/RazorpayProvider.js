import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PaymentProvider, PaymentProviderError, PAYMENT_TYPES, PAYMENT_STATUSES } from './PaymentProvider.js';

export class RazorpayProvider extends PaymentProvider {
  constructor(keyId, keySecret) {
    super();
    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    this.keySecret = keySecret;
    this.keyId = keyId;
  }

  getProviderName() {
    return 'razorpay';
  }

  async createPaymentOrders({ rentalFeeCents, depositCents, orderId, currency = 'INR' }) {
    try {
      // Create rental fee Razorpay Order
      const rentalOrder = await this.razorpay.orders.create({
        amount: rentalFeeCents,
        currency,
        receipt: `r_${orderId.replace(/-/g, '')}`,
        notes: { orderId, type: PAYMENT_TYPES.RENTAL_FEE },
      });

      // Create deposit Razorpay Order
      const depositOrder = await this.razorpay.orders.create({
        amount: depositCents,
        currency,
        receipt: `d_${orderId.replace(/-/g, '')}`,
        notes: { orderId, type: PAYMENT_TYPES.DEPOSIT },
      });

      return {
        rental: {
          id: rentalOrder.id,
          orderId: rentalOrder.id,
          keyId: this.keyId,
        },
        deposit: {
          id: depositOrder.id,
          orderId: depositOrder.id,
          keyId: this.keyId,
        },
      };
    } catch (err) {
      const msg = err.message || err.error?.description || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      throw new PaymentProviderError(`Razorpay order creation failed: ${msg}`, 'PAYMENT_CREATION_FAILED', { originalError: err });
    }
  }

  async verifyWebhook({ rawBody, signature }) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new PaymentProviderError('RAZORPAY_WEBHOOK_SECRET not configured', 'CONFIG_MISSING');
    }
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return { verified: false, error: 'Invalid signature' };
      }

      const event = JSON.parse(rawBody);
      return { verified: true, event };
    } catch (err) {
      return { verified: false, error: err.message };
    }
  }

  async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    try {
      // Verify signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return {
          verified: false,
          status: 'failed',
          providerPaymentId: razorpayPaymentId,
          error: 'Invalid signature',
        };
      }

      // Fetch payment details
      const payment = await this.razorpay.payments.fetch(razorpayPaymentId);
      const order = await this.razorpay.orders.fetch(razorpayOrderId);

      return { 
        verified: true, 
        status: payment.status, 
        providerPaymentId: payment.id,
        amount: payment.amount,
      };
    } catch (err) {
      return { verified: false, status: 'failed', providerPaymentId: razorpayPaymentId, error: err.message };
    }
  }

  async capturePayment(paymentId, amount) {
    try {
      const payment = await this.razorpay.payments.capture(paymentId, amount);
      return {
        success: true,
        paymentId: payment.id,
        amountCaptured: payment.amount,
        status: payment.status,
      };
    } catch (err) {
      throw new PaymentProviderError(`Razorpay capture failed: ${err.message}`, 'CAPTURE_FAILED', { originalError: err });
    }
  }

  async refundPayment({ providerPaymentId, amountCents, reason = 'requested_by_customer' }) {
    try {
      const refund = await this.razorpay.payments.refund(providerPaymentId, {
        amount: amountCents,
        notes: { reason },
      });
      return { success: true, refundId: refund.id, amount: refund.amount };
    } catch (err) {
      throw new PaymentProviderError(`Razorpay refund failed: ${err.message}`, 'REFUND_FAILED', { originalError: err });
    }
  }

  async cancelPayment({ providerOrderId }) {
    // Razorpay orders cannot be explicitly cancelled, they just expire
    return { success: true, orderId: providerOrderId, status: 'expired' };
  }

  async getPaymentStatus({ providerPaymentId }) {
    try {
      const payment = await this.razorpay.payments.fetch(providerPaymentId);
      return {
        status: payment.status,
        amountCents: payment.amount,
        captured: payment.status === 'captured',
      };
    } catch (err) {
      throw new PaymentProviderError(`Razorpay status check failed: ${err.message}`, 'STATUS_CHECK_FAILED', { originalError: err });
    }
  }
}

export { PAYMENT_TYPES, PAYMENT_STATUSES } from './PaymentProvider.js';