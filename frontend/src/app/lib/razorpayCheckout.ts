export interface RazorpayCheckoutOptions {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  customerName: string;
  customerEmail: string;
  customerContact: string;
  description: string;
  orderId: string;
  paymentType: 'RENTAL_FEE' | 'DEPOSIT';
}

export interface RazorpayCheckoutResult {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

export interface RazorpayError {
  code: string;
  description: string;
  metadata?: Record<string, unknown>;
}

let razorpayLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in browser'));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (razorpayLoadPromise) {
    return razorpayLoadPromise;
  }

  razorpayLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayLoadPromise = null;
      reject(new Error('Failed to load Razorpay checkout script'));
    };
    document.head.appendChild(script);
  });

  return razorpayLoadPromise;
}

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult | null> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      name: 'RentSure',
      description: options.description,
      order_id: options.razorpayOrderId,
      prefill: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerContact,
      },
      notes: {
        order_id: options.orderId,
        payment_type: options.paymentType,
      },
      theme: {
        color: '#738A6E',
      },
      handler: (response: any) => {
        resolve({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          resolve(null);
        },
        escape: true,
        backdropclose: true,
      },
    });

    rzp.on('payment.failed', (response: { error: RazorpayError }) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });

    rzp.open();
  });
}

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      prefill: { name: string; email: string; contact: string };
      notes: { order_id: string; payment_type: string };
      theme: { color: string };
      handler: (response: RazorpayCheckoutResult) => void;
      modal: {
        ondismiss: () => void;
        escape: boolean;
        backdropclose: boolean;
      };
    }) => {
      on: (event: 'payment.failed', handler: (response: { error: RazorpayError }) => void) => void;
      open: () => void;
    };
  }
}