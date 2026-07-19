import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getOrderById, getReturnSlots } from '../../lib/api';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { OrderTimeline } from '../../components/shared/OrderTimeline';
import { formatDate, formatPrice, formatPricingLabel } from '../../lib/utils';
import { ArrowLeft, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus } from '../../lib/types';

type ModalType = 'confirm-delivery' | 'schedule-return' | 'report-issue' | null;

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [returnSlots, setReturnSlots] = useState<any[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [deliveryDecision, setDeliveryDecision] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [resolution, setResolution] = useState<'REFUND' | 'REPLACE'>('REFUND');
  const [reason, setReason] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [issueDescription, setIssueDescription] = useState('');

  useEffect(() => {
    if (id) loadOrder(id);
  }, [id]);

  async function loadOrder(orderId: string) {
    setLoading(true);
    try {
      const res = await getOrderById(orderId);
      const data = (res.data as any)?.data || res.data;
      setOrder(data);
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  async function loadReturnSlots() {
    try {
      const res = await getReturnSlots();
      const data = (res.data as any)?.slots || res.data || [];
      setReturnSlots(Array.isArray(data) ? data : []);
    } catch {
      setReturnSlots([]);
    }
  }

  function handleOpenModal(type: ModalType) {
    if (type === 'schedule-return') loadReturnSlots();
    setModal(type);
  }

  function handleAction(action: string) {
    toast.success(`${action} — action recorded`);
    setModal(null);
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8EA58C' }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading order details…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#8EA58C' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Order not found</div>
        <button onClick={() => navigate(-1)} style={{ color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>← Go back</button>
      </div>
    );
  }

  const status = order.status as OrderStatus;

  // Normalise nested data safely
  const product = order.product || {};
  const pricing = order.pricing || {};
  const deposit = order.deposit || {};
  const payments = order.payments || [];
  const orderEvents = order.orderEvents || order.timeline || [];
  const rentalPayment = payments.find((p: any) => p.type === 'RENTAL_FEE' || p.paymentType === 'RENTAL_FEE');

  return (
    <div style={{ maxWidth: '960px' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to orders
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#8EA58C', marginBottom: '4px', fontFamily: 'monospace' }}>#{order.id}</div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {product.name || 'Order Details'}
          </h1>
          <StatusBadge status={status} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {status === 'DISPATCHED' && (
            <ActionBtn label="Confirm Delivery" onClick={() => handleOpenModal('confirm-delivery')} />
          )}
          {(status === 'ACTIVE_RENTAL' || status === 'HANDED_OVER') && (
            <>
              {status === 'ACTIVE_RENTAL' && <ActionBtn label="Schedule Return" onClick={() => handleOpenModal('schedule-return')} secondary />}
              <ActionBtn label="Report Issue" onClick={() => handleOpenModal('report-issue')} warning />
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Product info */}
          <Section title="Product">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {product.thumbnail && (
                <img src={product.thumbnail} alt={product.name} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontWeight: 600, color: '#344C3D', marginBottom: '4px' }}>{product.name || '—'}</div>
                {product.brand && <div style={{ fontSize: '13px', color: '#8EA58C' }}>{product.brand}{product.category?.name ? ' · ' + product.category.name : ''}</div>}
                {product.vendor?.companyName && <div style={{ fontSize: '13px', color: '#738A6E', marginTop: '2px' }}>by {product.vendor.companyName}</div>}
              </div>
            </div>
          </Section>

          {/* Rental details */}
          <Section title="Rental Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {pricing.period && <DetailRow label="Pricing Tier" value={formatPricingLabel(pricing.period, pricing.duration)} />}
              {pricing.price != null && <DetailRow label="Rental Fee" value={formatPrice(pricing.price)} />}
              <DetailRow label="Quantity" value={String(order.quantity || 1)} />
              <DetailRow label="Channel" value={order.channel || '—'} />
              {order.rentalPeriodStart && <DetailRow label="Start Date" value={formatDate(order.rentalPeriodStart)} />}
              {order.rentalPeriodEnd && <DetailRow label="End Date" value={formatDate(order.rentalPeriodEnd)} />}
              {order.deliveryType && <DetailRow label="Delivery" value={order.deliveryType} />}
            </div>
          </Section>

          {/* Deposit */}
          {(deposit.amountHeld != null || deposit.status) && (
            <Section title="Security Deposit">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {deposit.amountHeld != null && <DetailRow label="Amount Held" value={formatPrice(deposit.amountHeld)} />}
                {deposit.status && <DetailRow label="Status" value={deposit.status} />}
                {deposit.deductionAmount != null && <DetailRow label="Deduction" value={formatPrice(deposit.deductionAmount)} />}
                {deposit.refundAmount != null && <DetailRow label="Refund Amount" value={formatPrice(deposit.refundAmount)} />}
              </div>
            </Section>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Section title="Payments">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payments.map((p: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < payments.length - 1 ? '1px solid #F0F3EF' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#344C3D' }}>{p.paymentType || p.type || 'Payment'}</div>
                      <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '2px' }}>{p.provider || 'Razorpay'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{formatPrice(p.amount)}</div>
                      <div style={{ fontSize: '11px', color: p.status === 'CAPTURED' ? '#738A6E' : '#C97B3D', marginTop: '2px' }}>{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Order Timeline</div>
            <OrderTimeline events={orderEvents} currentStatus={status} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700, color: '#344C3D', fontSize: '16px' }}>
                {modal === 'confirm-delivery' ? 'Confirm Delivery' : modal === 'schedule-return' ? 'Schedule Return' : 'Report Issue'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {modal === 'confirm-delivery' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['ACCEPT', 'REJECT'] as const).map(d => (
                      <button key={d} onClick={() => setDeliveryDecision(d)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${deliveryDecision === d ? '#738A6E' : '#E4E7E2'}`, background: deliveryDecision === d ? 'rgba(115,138,110,0.08)' : '#fff', color: deliveryDecision === d ? '#344C3D' : '#8EA58C', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>{d}</button>
                    ))}
                  </div>
                  {deliveryDecision === 'REJECT' && (
                    <>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Resolution</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['REFUND', 'REPLACE'] as const).map(r => (
                            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#344C3D' }}>
                              <input type="radio" value={r} checked={resolution === r} onChange={() => setResolution(r)} /> {r}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Reason</div>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Describe the issue…" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                      </div>
                      <PhotoUploadGrid />
                    </>
                  )}
                </div>
              )}

              {modal === 'schedule-return' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#738A6E', marginBottom: '8px' }}>Select your preferred return slot</p>
                  {returnSlots.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#8EA58C', textAlign: 'center', padding: '24px' }}>No slots available</div>
                  ) : returnSlots.slice(0, 6).map((slot: any) => {
                    const pct = slot.bookedCount / slot.capacity;
                    const isFull = pct >= 1;
                    return (
                      <button key={slot.id} onClick={() => !isFull && setSelectedSlot(slot.id)} disabled={isFull} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${selectedSlot === slot.id ? '#738A6E' : '#E4E7E2'}`, background: selectedSlot === slot.id ? 'rgba(115,138,110,0.06)' : '#FAFAF8', cursor: isFull ? 'not-allowed' : 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isFull ? '#BFCFBB' : '#344C3D' }}>{slot.date} — {slot.slotLabel}</span>
                          <span style={{ fontSize: '11px', color: isFull ? '#C97B3D' : '#8EA58C' }}>{slot.bookedCount}/{slot.capacity} booked</span>
                        </div>
                        <div style={{ height: '4px', background: '#E4E7E2', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: pct >= 0.8 ? '#C97B3D' : '#738A6E', borderRadius: '2px' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {modal === 'report-issue' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Describe the issue</div>
                    <textarea value={issueDescription} onChange={e => setIssueDescription(e.target.value)} rows={4} placeholder="What went wrong?" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                  <PhotoUploadGrid />
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #E4E7E2', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAction(modal)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoUploadGrid() {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Photos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ aspectRatio: '1', border: '2px dashed #E4E7E2', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAF8', gap: '4px' }}>
            <Upload size={16} color="#BFCFBB" />
            <span style={{ fontSize: '10px', color: '#BFCFBB' }}>Upload</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #E4E7E2', background: '#F0F3EF' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#8EA58C', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#344C3D' }}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, onClick, secondary, warning }: { label: string; onClick: () => void; secondary?: boolean; warning?: boolean }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid', borderColor: warning ? '#C97B3D' : secondary ? '#E4E7E2' : 'transparent', background: warning ? 'rgba(201,123,61,0.08)' : secondary ? '#fff' : '#738A6E', color: warning ? '#C97B3D' : secondary ? '#344C3D' : '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
