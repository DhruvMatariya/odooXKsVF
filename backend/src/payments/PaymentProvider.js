/**
 * Payment Provider Abstraction - Razorpay only
 */
export class PaymentProvider {
  /**
   * Create payment orders for rental fee and deposit
   * @param {Object} params
   * @param {number} params.rentalFeeCents - Rental fee in smallest currency unit
   * @param {number} params.depositCents - Deposit in smallest currency unit
   * @param {string} params.orderId - Our internal order ID
   * @param {string} params.currency - Currency code (default: 'INR')
   * @returns {Promise<{ rental: { id, orderId }, deposit: { id, orderId } }>}
   */
  async createPaymentOrders({ rentalFeeCents, depositCents, orderId, currency = 'INR' }) {
    throw new Error('Not implemented');
  }

  /**
   * Verify payment signature/webhook
   * @param {Object} params
   * @param {string} params.rawBody - Raw request body
   * @param {string} params.signature - Signature header
   * @returns {Promise<{ verified: boolean, event?: Object, error?: string }>}
   */
  async verifyWebhook({ rawBody, signature }) {
    throw new Error('Not implemented');
  }

  /**
   * Verify payment completion (for frontend callback)
   * @param {Object} params
   * @param {string} params.razorpayOrderId - Provider order ID
   * @param {string} params.razorpayPaymentId - Provider payment ID
   * @param {string} params.razorpaySignature - Signature from frontend
   * @returns {Promise<{ verified: boolean, status: string, providerPaymentId: string, error?: string }>}
   */
  async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    throw new Error('Not implemented');
  }

  /**
   * Refund a payment
   * @param {Object} params
   * @param {string} params.providerPaymentId - Provider payment ID
   * @param {number} params.amountCents - Amount to refund in smallest currency unit
   * @param {string} params.reason - Refund reason
   * @returns {Promise<{ success: boolean, refundId: string, error?: string }>}
   */
  async refundPayment({ providerPaymentId, amountCents, reason = 'requested_by_customer' }) {
    throw new Error('Not implemented');
  }

  /**
   * Cancel a payment order
   * @param {Object} params
   * @param {string} params.providerOrderId - Provider order ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async cancelPayment({ providerOrderId }) {
    throw new Error('Not implemented');
  }

  /**
   * Get payment status
   * @param {Object} params
   * @param {string} params.providerPaymentId - Provider payment/intent ID
   * @returns {Promise<{ status: string, amountCents: number, captured: boolean }>}
   */
  async getPaymentStatus({ providerPaymentId }) {
    throw new Error('Not implemented');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    throw new Error('Not implemented');
  }
}

export class PaymentProviderError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PaymentProviderError';
    this.code = code;
    this.details = details;
  }
}

export const PAYMENT_TYPES = {
  RENTAL_FEE: 'RENTAL_FEE',
  DEPOSIT: 'DEPOSIT'
};

export const PAYMENT_STATUSES = {
  CREATED: 'created',
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  CAPTURED: 'captured'
};