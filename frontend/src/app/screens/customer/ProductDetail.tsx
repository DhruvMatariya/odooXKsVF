import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { formatPrice, formatPricingLabel } from '../../lib/utils';
import { PricingTierCard } from '../../components/shared/PricingTierCard';
import { PaymentStatusDisplay } from '../../components/shared/PaymentStatusDisplay';
import type { PricingTier } from '../../lib/types';
import { ArrowLeft, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getProductById,
  createOrder,
  verifyPayment,
  retryPayment,
} from '../../lib/api';
import type { CreateOrderData, CreateOrderResponse, VerifyPaymentData } from '../../lib/api';
import { openRazorpayCheckout } from '../../lib/razorpayCheckout';
import type { RazorpayCheckoutResult } from '../../lib/razorpayCheckout';

type OrderStatus =
  | 'idle' | 'creating' | 'paying_rental' | 'verifying_rental'
  | 'paying_deposit' | 'verifying_deposit' | 'success' | 'partial_failure' | 'error';

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
  rawOrderData: CreateOrderResponse | null;
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
    rawOrderData: null,
  });

  const isProcessing = ['creating', 'paying_rental', 'verifying_rental', 'paying_deposit', 'verifying_deposit'].includes(orderState.status);
  const totalRental = selectedPricing ? selectedPricing.price * quantity : 0;
  const totalDeposit = selectedPricing ? selectedPricing.deposit * quantity : 0;
  const totalAmount = totalRental + totalDeposit;

  useEffect(() => { if (id) loadProduct(id); }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    try {
      const res: any = await getProductById(productId);
      // apiFetch returns raw JSON: { success, data: {...}, message }
      const productData = res.data || res;
      if (productData?.id) {
        setProduct(productData);
        if (productData.pricing?.length > 0) setSelectedPricing(productData.pricing[0]);
      }
    } catch { toast.error('Failed to load product'); }
    finally { setLoading(false); }
  }

  const generateIdempotencyKey = useCallback(() =>
    `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, []);

  function getUser() {
    try {
      const u = localStorage.getItem('rentsure_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }
  function getCustomerName() { const u = getUser(); return u?.full_name || u?.fullName || null; }
  function getCustomerEmail() { const u = getUser(); return u?.email || null; }
  function getCustomerContact() { const u = getUser(); return u?.phone || u?.contact || '9999999999'; }
  function getRazorpayKeyId() { return import.meta.env.VITE_RAZORPAY_KEY_ID || ''; }

  async function handleRentNow() {
    if (!selectedPricing) { toast.error('Please select a pricing tier'); return; }
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
        rentalPeriodStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        rentalPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const response = await createOrder(orderData, idempotencyKey);
      const order = response.data!;
      setOrderState(prev => ({ ...prev, orderId: order.order.id, rawOrderData: order, status: 'paying_rental' }));
      
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
    if (!customerName || !customerEmail) {
      toast.error('Customer information not available. Please log in again.');
      setOrderState(prev => ({ ...prev, status: 'error', error: 'Missing customer info' }));
      return;
    }
    try {
      const result = await openRazorpayCheckout({
        razorpayOrderId: order.razorpayOrderIdRental,
        amount: Math.round(totalRental * 100), currency: 'INR',
        keyId: order.razorpayKeyId,
        customerName, customerEmail,
        customerContact: customerContact || '9999999999',
        description: `Rental fee for ${product.name} (${formatPricingLabel(selectedPricing!.period, selectedPricing!.duration)}) x${quantity}`,
        orderId: order.order.id, paymentType: 'RENTAL_FEE',
      });
      if (!result) {
        setOrderState(prev => ({ ...prev, status: 'error', error: 'Rental payment cancelled' }));
        toast.error('Rental payment was cancelled'); return;
      }
      setOrderState(prev => ({ ...prev, rentalPayment: result, status: 'paying_deposit' }));
      await processDepositPayment(order.order.id, result, order);
    } catch (error: any) {
      const message = error.message || 'Rental payment failed';
      setOrderState(prev => ({ ...prev, status: 'error', error: message }));
      toast.error(message);
    }
  }

  async function processDepositPayment(orderId: string, rentalResult: any, orderData: CreateOrderResponse) {
    try {
      const depositResult = await openRazorpayCheckout({
        razorpayOrderId: orderData.razorpayOrderIdDeposit, amount: Math.round(totalDeposit * 100), currency: 'INR',
        keyId: orderData.razorpayKeyId,
        customerName: getCustomerName()!, customerEmail: getCustomerEmail()!,
        customerContact: getCustomerContact() || '9999999999',
        description: `Security deposit for ${product.name} (${formatPricingLabel(selectedPricing!.period, selectedPricing!.duration)}) x${quantity}`,
        orderId, paymentType: 'DEPOSIT',
      });
      if (!depositResult) {
        setOrderState(prev => ({ ...prev, status: 'partial_failure', error: 'Deposit payment cancelled. Rental fee paid but deposit pending.' }));
        toast.error('Deposit payment cancelled. Complete it from your orders page.'); return;
      }
      setOrderState(prev => ({ ...prev, depositPayment: depositResult, status: 'verifying_deposit' }));
      await verifyBothPayments(orderId, rentalResult, depositResult);
    } catch (error: any) {
      const message = error.message || 'Deposit payment failed';
      setOrderState(prev => ({ ...prev, status: 'partial_failure', error: message }));
      toast.error(message);
    }
  }

  async function verifyBothPayments(orderId: string, rentalResult: RazorpayCheckoutResult, depositResult: RazorpayCheckoutResult) {
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
      setTimeout(() => navigate(`/customer/orders/${orderId}`), 1500);
    } catch (error: any) {
      const message = error.message || 'Payment verification failed';
      setOrderState(prev => ({ ...prev, status: 'partial_failure', error: `Payments captured but verification failed: ${message}` }));
      toast.error('Payments captured but verification failed. Please contact support.');
    }
  }

  async function handleRetryPayment() {
    if (!orderState.orderId) return;
    setOrderState(prev => ({ ...prev, status: 'creating', error: null, isRetry: true }));
    try {
      const response = await retryPayment(orderState.orderId);
      const order = response.data!;
      setOrderState(prev => ({ ...prev, rawOrderData: order, status: 'paying_rental', rentalPayment: null, depositPayment: null }));
      await processRentalPayment(order);
    } catch (error: any) {
      const message = error.message || 'Failed to retry payment';
      setOrderState(prev => ({ ...prev, status: 'error', error: message }));
      toast.error(message);
    }
  }

  async function handleRetryDepositOnly() {
    if (!orderState.orderId || !orderState.rentalPayment || !orderState.rawOrderData) return;
    setOrderState(prev => ({ ...prev, status: 'paying_deposit', error: null }));
    await processDepositPayment(orderState.orderId, orderState.rentalPayment, orderState.rawOrderData);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8EA58C' }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading product details…</div>
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

  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80';

  const allImages = (() => {
    const imgs = product.images?.filter((u: string) => u && u.startsWith('http'));
    if (imgs?.length > 0) return imgs;
    if (product.thumbnail && product.thumbnail.startsWith('http')) return [product.thumbnail];
    return [FALLBACK_IMAGE];
  })();
  const available = product.inventory?.available || 0;
  const isOutOfStock = available === 0;

  function getFallbackImage(): string { return FALLBACK_IMAGE; }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}
      >
        <ArrowLeft size={15} /> Back to products
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Image gallery */}
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ height: '420px', overflow: 'hidden', background: '#F0F3EF' }}>
              <img src={allImages[selectedImage] || FALLBACK_IMAGE} alt={product.name} onError={e => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '16px', overflowX: 'auto' }}>
                {allImages.map((url: string, index: number) => (
                  <button key={index} onClick={() => setSelectedImage(index)} style={{ flexShrink: 0, width: '80px', height: '60px', borderRadius: '8px', border: selectedImage === index ? '2px solid #738A6E' : '1px solid #E4E7E2', padding: 0, cursor: 'pointer', overflow: 'hidden' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Product details</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#344C3D', marginBottom: '4px' }}>{product.name}</div>
            {product.brand && (
              <div style={{ fontSize: '13px', color: '#738A6E', marginBottom: '12px' }}>{product.brand}{product.manufacturer ? ' · ' + product.manufacturer : ''}</div>
            )}
            <div style={{ fontSize: '14px', color: '#344C3D', lineHeight: '1.6' }}>
              {product.description || 'No description available.'}
            </div>
          </div>

          {/* Rental policies */}
          {(product.lateFeeRule || product.cancellationPolicy) && (
            <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px' }}>
              <button
                onClick={() => setTermsOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#344C3D' }}
              >
                Rental Policies
                {termsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {termsOpen && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {product.lateFeeRule && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Late returns</div>
                      <div style={{ fontSize: '14px', color: '#344C3D' }}>
                        {product.lateFeeRule.gracePeriodHours}hr grace period, then {formatPrice(product.lateFeeRule.rateAmount)}/{product.lateFeeRule.rateType.toLowerCase()}, capped at {formatPrice(product.lateFeeRule.maxCap)}.
                      </div>
                    </div>
                  )}
                  {product.cancellationPolicy && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Cancellations</div>
                      <div style={{ fontSize: '14px', color: '#344C3D' }}>
                        Full refund if cancelled {product.cancellationPolicy.fullRefundHoursBefore}hr+ before start. {product.cancellationPolicy.partialRefundPercent}% refund if {product.cancellationPolicy.partialRefundHoursBefore}hr+ before, no refund otherwise.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment status */}
          {orderState.status !== 'idle' && (
            <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #E4E7E2', background: '#FAFAF8' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '12px' }}>Payment Status</h3>
              <PaymentStatusDisplay state={orderState} onRetry={handleRetryPayment} onRetryDeposit={handleRetryDepositOnly} />
            </div>
          )}
        </div>

        {/* Right column — booking card */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Price */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Rental from</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#344C3D' }}>
                {selectedPricing ? formatPrice(selectedPricing.price) : '—'}
              </div>
            </div>

            {/* Availability */}
            <div style={{ padding: '12px', borderRadius: '10px', background: '#F0F3EF', border: '1px solid #E4E7E2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#344C3D' }}>Available</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: available > 0 ? '#738A6E' : '#C97B3D' }}>
                  {available} units
                </span>
              </div>
            </div>

            {/* Pricing tiers */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Select duration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {product.pricing?.map((p: PricingTier) => (
                  <PricingTierCard key={p.id} pricing={p} selected={selectedPricing?.id === p.id} onSelect={() => setSelectedPricing(p)} />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={isProcessing} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#344C3D', opacity: isProcessing ? 0.5 : 1 }}>−</button>
                <span style={{ fontWeight: 600, color: '#344C3D', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(available, q + 1))} disabled={isProcessing} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '16px', color: '#344C3D', opacity: isProcessing ? 0.5 : 1 }}>+</button>
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
            <div style={{ borderTop: '1px solid #E4E7E2', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#344C3D' }}>Rental ({quantity}× {selectedPricing ? formatPricingLabel(selectedPricing.period, selectedPricing.duration) : ''})</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#344C3D' }}>{formatPrice(totalRental)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#344C3D' }}>Security Deposit</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#344C3D' }}>{formatPrice(totalDeposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E4E7E2' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#344C3D' }}>Total</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#344C3D' }}>{formatPrice(totalAmount)}</span>
              </div>
            </div>

            {/* Rent Now */}
            <button
              onClick={handleRentNow}
              disabled={isOutOfStock || !selectedPricing || isProcessing}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: isOutOfStock || !selectedPricing || isProcessing ? '#A9C2A4' : '#738A6E', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: isOutOfStock || !selectedPricing || isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isProcessing && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
              {isOutOfStock ? 'Out of Stock' : !selectedPricing ? 'Select a tier' : isProcessing ? 'Processing…' : 'Rent Now'}
            </button>

            <div style={{ fontSize: '11px', color: '#8EA58C', textAlign: 'center', lineHeight: '1.4' }}>
              Security deposit is fully refundable upon return in good condition.
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}