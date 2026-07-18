import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { formatPrice, formatPricingLabel } from '../../lib/utils';
import { PricingTierCard } from '../../components/shared/PricingTierCard';
import { PaymentStatusDisplay } from '../../components/shared/PaymentStatusDisplay';
import type { PricingTier } from '../../lib/types';
import { ChevronDown, ChevronUp, ArrowLeft, Loader2, CreditCard, AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getProductById, createOrder, verifyPayment, retryPayment, CreateOrderData, CreateOrderResponse, VerifyPaymentData } from '../../lib/api';
import { openRazorpayCheckout, RazorpayCheckoutResult } from '../../lib/razorpayCheckout';

type OrderStatus = 'idle' | 'creating' | 'paying_rental' | 'verifying_rental' | 'paying_deposit' | 'verifying_deposit' | 'success' | 'partial_failure' | 'error';

interface PaymentResult {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

interface OrderState {
  orderId: string | null;
  rentalPayment: PaymentResult | null;
  depositPayment: PaymentResult | null;
  status: OrderStatus;
  error: string | null;
  isRetry: boolean;
}

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedPricing, setSelectedPricing] = useState<PricingTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [termsOpen, setTermsOpen] = useState(false);

  const [orderState, setOrderState] = useState<OrderState>({
    orderId: null,
    rentalPayment: null,
    depositPayment: null,
    status: 'idle',
    error: null,
    isRetry: false,
  });

  const isProcessing = ['creating', 'paying_rental', 'verifying_rental', 'paying_deposit', 'verifying_deposit'].includes(orderState.status);

  useEffect(() => {
    if (id) loadProduct(id);
  }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    try {
      const res = await getProductById(productId);
      if (res.data) setProduct(res.data);
    } catch (e) {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  const totalRental = selectedPricing ? selectedPricing.price * quantity : 0;
  const totalDeposit = selectedPricing ? selectedPricing.deposit * quantity : 0;
  const totalAmount = totalRental + totalDeposit;

  const generateIdempotencyKey = useCallback(() => {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  async function handleRentNow() {
    if (!selectedPricing) {
      toast.error('Please select a pricing tier');
      return;
    }
    if (!id) return;

    const idempotencyKey = generateIdempotencyKey();
    setOrderState(prev => ({ ...prev, status: 'creating', error: null }));

    try {
      const orderData: CreateOrderData = {
        productId: id,
        pricingId: selectedPricing.id,
        quantity,
        channel: 'ONLINE',
        deliveryType,
        rentalPeriodStart: product.rentalPeriodStart || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        rentalPeriodEnd: product.rentalPeriodEnd || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await createOrder(orderData, idempotencyKey);
      const order = response.data!;

      setOrderState(prev => ({
        ...prev,
        orderId: order.order.id,
        status: 'paying_rental',
      }));

      await processRentalPayment(order);
    } catch (error: any) {
      const message = error.message || 'Failed to create order';
      setOrderState(prev => ({ ...prev, status: 'error', error: message }));
      toast.error(message);
    }
  }

  async function processRentalPayment(order: CreateOrderResponse) {
    const customerName = getCustomerName();
    const customerEmail = getCustomerEmail();
    const customerContact = getCustomerContact();

    if (!customerName || !customerEmail || !customerContact) {
      toast.error('Customer information not available. Please log in again.');
      setOrderState(prev => ({ ...prev, status: 'error', error: 'Missing customer info' }));
      return;
    }

    try {
      const result = await openRazorpayCheckout({
        razorpayOrderId: order.razorpayOrderIdRental,
        amount: totalRental,
        currency: 'INR',
        keyId: order.razorpayKeyId,
        customerName,
        customerEmail,
        customerContact,
        description: `Rental fee for ${product.name} (${formatPricingLabel(selectedPricing!.period, selectedPricing!.duration)}) x${quantity}`,
        orderId: order.order.id,
        paymentType: 'RENTAL_FEE',
      });

      if (!result) {
        setOrderState(prev => ({ ...prev, status: 'error', error: 'Rental payment cancelled' }));
        toast.error('Rental payment was cancelled');
        return;
      }

      setOrderState(prev => ({
        ...prev,
        rentalPayment: result,
        status: 'verifying_rental',
      }));

      await verifyRentalPayment(order.order.id, result);
    } catch (error: any) {
      const message = error.message || 'Rental payment failed';
      setOrderState(prev => ({ ...prev, status: 'error', error: message }));
      toast.error(message);
    }
  }

  async function verifyRentalPayment(orderId: string, rentalResult: PaymentResult) {
    try {
      setOrderState(prev => ({ ...prev, status: 'paying_deposit' }));

      const depositResult = await openRazorpayCheckout({
        razorpayOrderId: orderState.orderId!,
        amount: totalDeposit,
        currency: 'INR',
        keyId: getRazorpayKeyId(),
        customerName: getCustomerName()!,
        customerEmail: getCustomerEmail()!,
        customerContact: getCustomerContact()!,
        description: `Security deposit for ${product.name} (${formatPricingLabel(selectedPricing!.period, selectedPricing!.duration)}) x${quantity}`,
        orderId,
        paymentType: 'DEPOSIT',
      });

      if (!depositResult) {
        setOrderState(prev => ({
          ...prev,
          status: 'partial_failure',
          error: 'Deposit payment cancelled. Rental fee paid but deposit pending.',
        }));
        toast.error('Deposit payment cancelled. You can complete it from your orders page.');
        return;
      }

      setOrderState(prev => ({
        ...prev,
        depositPayment: depositResult,
        status: 'verifying_deposit',
      }));

      await verifyBothPayments(orderId, rentalResult, depositResult);
    } catch (error: any) {
      const message = error.message || 'Deposit payment failed';
      setOrderState(prev => ({ ...prev, status: 'partial_failure', error: `Rental paid, deposit failed: ${message}` }));
      toast.error(`Rental paid, but deposit failed: ${message}`);
    }
  }

  async function verifyBothPayments(
    orderId: string,
    rentalResult: PaymentResult,
    depositResult: PaymentResult
  ) {
    const verifyData: VerifyPaymentData = {
      provider: 'razorpay',
      razorpayOrderIdRental: rentalResult.razorpayOrderId,
      razorpayPaymentIdRental: rentalResult.razorpayPaymentId,
      razorpaySignatureRental: rentalResult.razorpaySignature,
      razorpayOrderIdDeposit: depositResult.razorpayOrderId,
      razorpayPaymentIdDeposit: depositResult.razorpayPaymentId,
      razorpaySignatureDeposit: depositResult.razorpaySignature,
    };

    try {
      await verifyPayment(orderId, verifyData);

      setOrderState(prev => ({ ...prev, status: 'success' }));
      toast.success('Order confirmed! Payment completed successfully.');

      setTimeout(() => {
        navigate(`/customer/orders/${orderId}`);
      }, 1500);
    } catch (error: any) {
      const message = error.message || 'Payment verification failed';
      setOrderState(prev => ({
        ...prev,
        status: 'partial_failure',
        error: `Payments captured but verification failed: ${message}`,
      }));
      toast.error(`Payments captured but verification failed: ${message}. Please contact support.`);
    }
  }

  async function handleRetryPayment() {
    if (!orderState.orderId) return;

    setOrderState(prev => ({ ...prev, status: 'creating', error: null, isRetry: true }));

    try {
      const response = await retryPayment(orderState.orderId);
      const order = response.data!;

      setOrderState(prev => ({
        ...prev,
        status: 'paying_rental',
        rentalPayment: null,
        depositPayment: null,
      }));

      await processRentalPayment(order);
    } catch (error: any) {
      const message = error.message || 'Failed to retry payment';
      setOrderState(prev => ({ ...prev, status: 'error', error: message }));
      toast.error(message);
    }
  }

  async function handleRetryDepositOnly() {
    if (!orderState.orderId || !orderState.rentalPayment) return;

    setOrderState(prev => ({ ...prev, status: 'paying_deposit', error: null }));

    try {
      const depositResult = await openRazorpayCheckout({
        razorpayOrderId: orderState.orderId,
        amount: totalDeposit,
        currency: 'INR',
        keyId: getRazorpayKeyId()!,
        customerName: getCustomerName()!,
        customerEmail: getCustomerEmail()!,
        customerContact: getCustomerContact()!,
        description: `Security deposit for ${product.name} (${formatPricingLabel(selectedPricing!.period, selectedPricing!.duration)}) x${quantity}`,
        orderId: orderState.orderId,
        paymentType: 'DEPOSIT',
      });

      if (!depositResult) {
        setOrderState(prev => ({ ...prev, status: 'partial_failure', error: 'Deposit payment cancelled' }));
        toast.error('Deposit payment cancelled');
        return;
      }

      setOrderState(prev => ({
        ...prev,
        depositPayment: depositResult,
        status: 'verifying_deposit',
      }));

      await verifyBothPayments(orderState.orderId, orderState.rentalPayment, depositResult);
    } catch (error: any) {
      const message = error.message || 'Deposit payment failed';
      setOrderState(prev => ({ ...prev, status: 'partial_failure', error: message }));
      toast.error(message);
    }
  }

  function getCustomerName(): string | null {
    try {
      const userStr = localStorage.getItem('rentsure_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.full_name || user.fullName || null;
      }
    } catch {}
    return null;
  }

  function getCustomerEmail(): string | null {
    try {
      const userStr = localStorage.getItem('rentsure_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.email || null;
      }
    } catch {}
    return null;
  }

  function getCustomerContact(): string | null {
    try {
      const userStr = localStorage.getItem('rentsure_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.phone || user.contact || null;
      }
    } catch {}
    return null;
  }

  function getRazorpayKeyId(): string | null {
    return import.meta.env.VITE_RAZORPAY_KEY_ID || null;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#8EA58C' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Loading…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#8EA58C' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Product not found</div>
        <button onClick={() => navigate(-1)} style={{ color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>← Go back</button>
      </div>
    );
  }

  const allImages = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to products
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }}>
        {/* Left: product info */}
        <div>
          {/* Image gallery */}
          <div style={{ background: '#F0F3EF', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', height: '380px' }}>
            <img src={allImages[selectedImage] ?? product.thumbnail} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {allImages.map((imgUrl, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)} style={{ width: '64px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${selectedImage === idx ? '#738A6E' : '#E4E7E2'}`, padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                  <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* Product info */}
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(115,138,110,0.12)', color: '#4a6848' }}>{product.category.name}</span>
          </div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '6px', lineHeight: 1.3 }}>{product.name}</h1>
          <div style={{ fontSize: '13px', color: '#8EA58C', marginBottom: '16px' }}>
            {product.brand} · {product.manufacturer} · by <strong style={{ color: '#738A6E' }}>{product.vendor.companyName}</strong>
          </div>
          <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: 1.7, marginBottom: '20px' }}>{product.description}</p>

          <div style={{ background: '#FAFAF8', border: '1px solid #E4E7E2', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '24px' }}>
            <InfoItem label="Available" value={`${product.inventory.available} units`} highlight={product.inventory.available === 0} />
            <InfoItem label="Brand" value={product.brand} />
            <InfoItem label="Category" value={product.category.name} />
          </div>

          {/* Pricing tiers */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontWeight: 600, color: '#344C3D', marginBottom: '10px', fontSize: '15px' }}>Select Pricing Tier</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {product.pricing.map(p => (
                <PricingTierCard key={p.id} pricing={p} selected={selectedPricing?.id === p.id} onSelect={setSelectedPricing} />
              ))}
            </div>
          </div>

          {/* Rental Terms collapsible */}
          <div style={{ border: '1px solid #E4E7E2', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
            <button onClick={() => setTermsOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F0F3EF', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#344C3D' }}>
              Rental Terms
              {termsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {termsOpen && (
              <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Late Fee Rule</div>
                  <TermRow label="Grace period" value={`${product.lateFeeRule.gracePeriodHours} hours`} />
                  <TermRow label="Rate type" value={product.lateFeeRule.rateType} />
                  <TermRow label="Rate" value={formatPrice(product.lateFeeRule.rateAmount) + '/unit'} />
                  <TermRow label="Max cap" value={formatPrice(product.lateFeeRule.maxCap)} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Cancellation Policy</div>
                  <TermRow label="Full refund if cancelled" value={`${product.cancellationPolicy.fullRefundHoursBefore}h before`} />
                  <TermRow label="Partial refund if cancelled" value={`${product.cancellationPolicy.partialRefundHoursBefore}h before`} />
                  <TermRow label="Partial refund %" value={`${product.cancellationPolicy.partialRefundPercent}%`} />
                </div>
              </div>
            )}
          </div>

          {/* Payment Status Display */}
          {orderState.status !== 'idle' && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#FAFAF8' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '12px' }}>Payment Status</h3>
              <PaymentStatusDisplay state={orderState} onRetry={handleRetryPayment} onRetryDeposit={handleRetryDepositOnly} />
            </div>
          )}
        </div>

        {/* Right: Sticky summary */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #E4E7E2', background: '#F0F3EF' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rental Summary</div>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selected tier */}
              {selectedPricing ? (
                <div style={{ background: '#F0F3EF', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', color: '#738A6E', marginBottom: '2px' }}>Selected tier</div>
                  <div style={{ fontWeight: 600, color: '#344C3D' }}>{formatPricingLabel(selectedPricing.period, selectedPricing.duration)} · {formatPrice(selectedPricing.price)}</div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#BFCFBB', padding: '10px 0', textAlign: 'center' }}>← Select a pricing tier</div>
              )}

              {/* Quantity */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Quantity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={isProcessing} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#344C3D', opacity: isProcessing ? 0.5 : 1 }}>−</button>
                  <span style={{ fontWeight: 600, color: '#344C3D', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(product.inventory.available, q + 1))} disabled={isProcessing} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#344C3D', opacity: isProcessing ? 0.5 : 1 }}>+</button>
                </div>
              </div>

              {/* Delivery type */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Delivery Type</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['PICKUP', 'DELIVERY'] as const).map(dt => (
                    <button key={dt} onClick={() => setDeliveryType(dt)} disabled={isProcessing} style={{ flex: 1, padding: '7px', borderRadius: '6px', border: `1px solid ${deliveryType === dt ? '#738A6E' : '#E4E7E2'}`, background: deliveryType === dt ? 'rgba(115,138,110,0.08)' : '#fff', color: deliveryType === dt ? '#344C3D' : '#8EA58C', fontWeight: deliveryType === dt ? 600 : 400, fontSize: '13px', cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1 }}>
                      {dt === 'PICKUP' ? 'Pickup' : 'Delivery'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              {selectedPricing && (
                <div style={{ borderTop: '1px solid #E4E7E2', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SummaryRow label="Rental" value={formatPrice(totalRental)} />
                  <SummaryRow label="Deposit" value={formatPrice(totalDeposit)} muted />
                  <div style={{ borderTop: '1px solid #E4E7E2', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#344C3D', fontSize: '15px' }}>Total</span>
                    <span style={{ fontWeight: 700, color: '#344C3D', fontSize: '20px' }}>{formatPrice(totalAmount)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8EA58C' }}>Deposit is refundable subject to inspection</div>
                </div>
              )}

              <button
                onClick={handleRentNow}
                disabled={product.inventory.available === 0 || !selectedPricing || isProcessing}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  background: product.inventory.available === 0 || !selectedPricing || isProcessing ? '#A9C2A4' : '#738A6E',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: product.inventory.available === 0 || !selectedPricing || isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isProcessing && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
                {product.inventory.available === 0 ? 'Out of Stock' : !selectedPricing ? 'Select a tier' : isProcessing ? 'Processing…' : 'Rent Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function InfoItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#8EA58C', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: highlight ? '#C97B3D' : '#344C3D' }}>{value}</div>
    </div>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
      <span style={{ color: '#8EA58C' }}>{label}</span>
      <span style={{ color: '#344C3D', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: muted ? '#8EA58C' : '#738A6E' }}>{label}</span>
      <span style={{ color: muted ? '#8EA58C' : '#344C3D', fontWeight: 500 }}>{value}</span>
    </div>
  );
}