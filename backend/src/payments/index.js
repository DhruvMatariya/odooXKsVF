import { PaymentProvider, PaymentProviderError } from './PaymentProvider.js';
import { RazorpayProvider } from './RazorpayProvider.js';
import env from '../config/env.js';

export function getPaymentProvider() {
  const provider = env.PAYMENT_PROVIDER?.toLowerCase();
  
  if (provider !== 'razorpay') {
    throw new PaymentProviderError(`Only Razorpay is supported. Got: ${provider}`, 'CONFIG_ERROR');
  }
  
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new PaymentProviderError('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET not configured', 'CONFIG_ERROR');
  }
  
  return new RazorpayProvider(env.RAZORPAY_KEY_ID, env.RAZORPAY_KEY_SECRET);
}

export { PaymentProvider, PaymentProviderError } from './PaymentProvider.js';
export { RazorpayProvider } from './RazorpayProvider.js';
export { PAYMENT_TYPES, PAYMENT_STATUSES } from './PaymentProvider.js';