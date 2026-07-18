import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ORDERS } from '../../lib/mockData';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { OrderTimeline } from '../../components/shared/OrderTimeline';
import { formatDate, formatPrice, formatPricingLabel } from '../../lib/utils';
import { ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus } from '../../lib/types';

type ModalType = 'dispatch' | 'mark-returned' | 'resolve-replacement' | 'resolve-dispute' | null;

export function VendorOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalType>(null);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState<'REDISPATCH' | 'REFUND'>('REDISPATCH');
  const [disputeAction, setDisputeAction] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');

  const order = ORDERS.find(o => o.id === id);

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '64px', color: '#8EA58C' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Order not found</div>
        <button onClick={() => navigate(-1)} style={{ color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>← Go back</button>
      </div>
    );
  }

  const status = order.status as OrderStatus;

  function handleAction(action: string) {
    toast.success(`${action} — action recorded`);
    setModal(null);
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to orders
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#8EA58C', marginBottom: '4px', fontFamily: 'monospace' }}>#{order.id}</div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '6px' }}>{order.product.name}</h1>
          <StatusBadge status={status} />
        </div>
        {/* Vendor contextual actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {status === 'CONFIRMED' && <ActionBtn label="Dispatch" onClick={() => setModal('dispatch')} />}
          {status === 'RETURN_SCHEDULED' && <ActionBtn label="Mark Returned" onClick={() => setModal('mark-returned')} />}
          {status === 'RETURNED_PENDING_INSPECTION' && (
            <ActionBtn label="Start Inspection" onClick={() => navigate(`/vendor/orders/${order.id}/inspection`)} />
          )}
          {status === 'REPLACEMENT_REQUESTED' && <ActionBtn label="Resolve Replacement" onClick={() => setModal('resolve-replacement')} warning />}
          {status === 'DISPUTED' && <ActionBtn label="Resolve Dispute" onClick={() => setModal('resolve-dispute')} warning />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Section title="Product">
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img src={order.product.thumbnail} alt={order.product.name} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#344C3D', marginBottom: '4px' }}>{order.product.name}</div>
                <div style={{ fontSize: '13px', color: '#8EA58C' }}>{order.product.brand} · {order.product.category.name}</div>
                {order.customerEmail && <div style={{ fontSize: '12px', color: '#738A6E', marginTop: '4px' }}>Customer: {order.customerEmail}</div>}
              </div>
            </div>
          </Section>

          <Section title="Rental Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <DetailRow label="Pricing Tier" value={formatPricingLabel(order.pricing.period, order.pricing.duration)} />
              <DetailRow label="Rental Fee" value={formatPrice(order.pricing.price)} />
              <DetailRow label="Quantity" value={String(order.quantity)} />
              <DetailRow label="Channel" value={order.channel} />
              <DetailRow label="Start Date" value={formatDate(order.rentalPeriodStart)} />
              <DetailRow label="End Date" value={formatDate(order.rentalPeriodEnd)} />
            </div>
          </Section>

          <Section title="Deposit">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <DetailRow label="Amount Held" value={formatPrice(order.deposit.amountHeld)} />
              <DetailRow label="Status" value={order.deposit.status} />
              <DetailRow label="Deduction" value={formatPrice(order.deposit.deductionAmount)} />
              <DetailRow label="Refund Amount" value={formatPrice(order.deposit.refundAmount)} />
            </div>
          </Section>
        </div>

        {/* Timeline */}
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Order Timeline</div>
          <OrderTimeline events={order.orderEvents} currentStatus={status} />
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '440px', boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700, color: '#344C3D', fontSize: '15px' }}>
                {modal === 'dispatch' ? 'Confirm Dispatch' : modal === 'mark-returned' ? 'Mark as Returned' : modal === 'resolve-replacement' ? 'Resolve Replacement' : 'Resolve Dispute'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {modal === 'dispatch' && (
                <p style={{ fontSize: '14px', color: '#738A6E' }}>Confirm that this order has been dispatched to the customer?</p>
              )}

              {modal === 'mark-returned' && (
                <p style={{ fontSize: '14px', color: '#738A6E' }}>Confirm that the customer has returned the item and it's with you?</p>
              )}

              {modal === 'resolve-replacement' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['REDISPATCH', 'REFUND'] as const).map(r => (
                      <button key={r} onClick={() => setResolution(r)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${resolution === r ? '#738A6E' : '#E4E7E2'}`, background: resolution === r ? 'rgba(115,138,110,0.08)' : '#fff', color: resolution === r ? '#344C3D' : '#8EA58C', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                        {r === 'REDISPATCH' ? 'Redispatch' : 'Refund'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Note</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
                </div>
              )}

              {modal === 'resolve-dispute' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['ACCEPT', 'REJECT'] as const).map(a => (
                      <button key={a} onClick={() => setDisputeAction(a)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${disputeAction === a ? '#738A6E' : '#E4E7E2'}`, background: disputeAction === a ? 'rgba(115,138,110,0.08)' : '#fff', color: disputeAction === a ? '#344C3D' : '#8EA58C', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                        {a === 'ACCEPT' ? 'Accept Dispute' : 'Reject Dispute'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Resolution Note</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                  </div>
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

function ActionBtn({ label, onClick, warning }: { label: string; onClick: () => void; warning?: boolean }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid', borderColor: warning ? '#C97B3D' : 'transparent', background: warning ? 'rgba(201,123,61,0.08)' : '#738A6E', color: warning ? '#C97B3D' : '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
