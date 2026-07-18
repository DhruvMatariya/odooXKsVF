import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { formatPrice, formatPricingLabel } from '../../lib/utils';
import { PricingTierCard } from '../../components/shared/PricingTierCard';
import type { PricingTier } from '../../lib/types';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { getProductById } from '../../lib/api';

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

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  async function loadProduct(productId: string) {
    setLoading(true);
    try {
      const res = await getProductById(productId);
      if (res.data?.data) {
        setProduct(res.data.data);
        if (res.data.data.pricing && res.data.data.pricing.length > 0) {
          setSelectedPricing(res.data.data.pricing[0]);
        }
      }
    } catch (e) {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
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

  const allImages = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  const totalRental = selectedPricing ? selectedPricing.price * quantity : 0;
  const totalDeposit = selectedPricing ? selectedPricing.deposit * quantity : 0;
  const totalAmount = totalRental + totalDeposit;

  function handleRentNow() {
    if (!selectedPricing) {
      toast.error('Please select a pricing tier');
      return;
    }
    toast.success('Order placed! Redirecting to orders…');
    navigate('/customer/orders');
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to products
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: '420px', overflow: 'hidden', background: '#F0F3EF' }}>
              <img src={allImages[selectedImage] || product.thumbnail} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {allImages.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', padding: '16px', overflowX: 'auto' }}>
                {allImages.map((url: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    style={{
                      flexShrink: 0, width: '80px', height: '60px', borderRadius: '8px',
                      border: selectedImage === index ? '2px solid #738A6E' : '1px solid #E4E7E2',
                      padding: 0, cursor: 'pointer', overflow: 'hidden'
                    }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Product details</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#344C3D', marginBottom: '4px' }}>{product.name}</div>
                {product.brand && (
                  <div style={{ fontSize: '13px', color: '#738A6E', marginBottom: '8px' }}>{product.brand} {product.manufacturer ? '· ' + product.manufacturer : ''}</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#344C3D', lineHeight: '1.6' }}>
              {product.description || 'No description available.'}
            </div>
          </div>

          {product.lateFeeRule || product.cancellationPolicy ? (
            <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px' }}>
              <button onClick={() => setTermsOpen(!termsOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>
                Rental policies
                {termsOpen ? <X size={16} /> : <span style={{ fontSize: '18px', lineHeight: 1 }}>›</span>}
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
                        Full refund if cancelled {product.cancellationPolicy.fullRefundHoursBefore}hr+ before start, {product.cancellationPolicy.partialRefundPercent}% refund if {product.cancellationPolicy.partialRefundHoursBefore}hr+ before, no refund otherwise.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Rental from</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#344C3D' }}>
                  {selectedPricing ? formatPrice(selectedPricing.price) : '—'}
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: '10px', background: '#F0F3EF', border: '1px solid #E4E7E2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#344C3D' }}>Available</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: product.inventory?.available > 0 ? '#738A6E' : '#C97B3D' }}>
                  {product.inventory?.available || 0} units
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Select duration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {product.pricing?.map((p: PricingTier) => (
                  <PricingTierCard key={p.id} tier={p} selected={selectedPricing?.id === p.id} onSelect={() => setSelectedPricing(p)} />
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Qty</div>
                <select value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E4E7E2', fontSize: '13px', outline: 'none', background: '#fff' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Delivery</div>
                <select value={deliveryType} onChange={e => setDeliveryType(e.target.value as any)} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E4E7E2', fontSize: '13px', outline: 'none', background: '#fff' }}>
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E4E7E2', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#344C3D' }}>Rental ({quantity}× {selectedPricing ? formatPricingLabel(selectedPricing.period, selectedPricing.duration) : ''})</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#344C3D' }}>{formatPrice(totalRental)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#344C3D' }}>Deposit</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#344C3D' }}>{formatPrice(totalDeposit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E4E7E2' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#344C3D' }}>Total</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#344C3D' }}>{formatPrice(totalAmount)}</span>
              </div>
            </div>

<button
                onClick={handleRentNow} disabled={!selectedPricing || (product.inventory?.available || 0) < quantity} style={{
                  width: '100%', padding: '11px 16px', borderRadius: '12px', border: 'none', background: !selectedPricing || (product.inventory?.available || 0) < quantity ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: selectedPricing && (product.inventory?.available || 0) >= quantity ? 'pointer' : 'not-allowed' }}>
              Rent now
            </button>

            <div style={{ fontSize: '11px', color: '#8EA58C', textAlign: 'center', lineHeight: '1.4' }}>
              Security deposit is refundable upon return in good condition.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
