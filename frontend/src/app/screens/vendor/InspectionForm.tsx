import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { formatPrice } from '../../lib/utils';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { inspectOrder, getOrderById } from '../../lib/api';

export function InspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    damageFound: false,
    conditionNotes: '',
    damageDeductionAmount: 0,
  });

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  async function loadOrder(orderId: string) {
    setLoading(true);
    try {
      const res = await getOrderById(orderId);
      if (res.data) {
        setOrder(res.data);
      }
    } catch (e) {
      toast.error('Failed to load order');
      navigate('/vendor/orders');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px', textAlign: 'center', color: '#8EA58C' }}>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading inspection…</div>
      </div>
    );
  }

  if (!order) {
    return <div style={{ color: '#8EA58C', padding: '32px' }}>Order not found</div>;
  }

  const depositHeld = order.deposit?.amountHeld || 0;
  const lateFeeRule = order.product?.lateFeeRule || { gracePeriodHours: 0, rateType: 'HOURLY', rateAmount: 0, maxCap: 0 };
  const actualReturnTime = order.actualReturnTime ? new Date(order.actualReturnTime) : new Date();
  const rentalPeriodEnd = order.rentalPeriodEnd ? new Date(order.rentalPeriodEnd) : new Date();
  const lateByMinutes = Math.max(0, Math.round((actualReturnTime.getTime() - rentalPeriodEnd.getTime()) / 60000));
  const lateByUnits = lateFeeRule.rateType === 'HOURLY' ? lateByMinutes / 60 : lateByMinutes / (60 * 24);
  const lateFee = Math.min(Math.ceil(lateByUnits) * lateFeeRule.rateAmount, lateFeeRule.maxCap);
  const damageDeduction = form.damageFound ? form.damageDeductionAmount : 0;
  const refundAmount = Math.max(0, depositHeld - lateFee - damageDeduction);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await inspectOrder(id!, {
        damageFound: form.damageFound,
        conditionNotes: form.conditionNotes,
        photos: [],
        damageDeductionAmount: form.damageDeductionAmount,
      });
      if (res.data) {
        toast.success('Inspection submitted — deposit settled');
        navigate('/vendor/orders');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Return Inspection</h1>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px' }}>{order.product?.name} · Order #{order.id}</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Damage section */}
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionLabel>Condition Assessment</SectionLabel>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Damage Found?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([true, false] as const).map(val => (
                <button key={String(val)} type="button" onClick={() => setForm(f => ({ ...f, damageFound: val }))} style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  border: `1px solid ${form.damageFound === val ? (val ? '#C97B3D' : '#738A6E') : '#E4E7E2'}`,
                  background: form.damageFound === val ? (val ? 'rgba(201,123,61,0.08)' : 'rgba(115,138,110,0.08)') : '#fff',
                  color: form.damageFound === val ? (val ? '#C97B3D' : '#344C3D') : '#8EA58C',
                  fontWeight: form.damageFound === val ? 600 : 400, fontSize: '13px', cursor: 'pointer',
                }}>
                  {val ? 'Yes — Damage Found' : 'No — Good Condition'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Condition Notes</label>
            <textarea value={form.conditionNotes} onChange={e => setForm(f => ({ ...f, conditionNotes: e.target.value }))} rows={4} placeholder="Describe the condition of the returned item…" style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '8px' }}>Photos (upload evidence)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ aspectRatio: '1', border: '2px dashed #E4E7E2', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAF8', gap: '4px' }}>
                  <Upload size={16} color="#BFCFBB" />
                  <span style={{ fontSize: '10px', color: '#BFCFBB' }}>Upload</span>
                </div>
              ))}
            </div>
          </div>

          {form.damageFound && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#C97B3D', marginBottom: '6px' }}>Damage Deduction Amount (paise)</label>
              <input type="number" min={0} max={depositHeld} value={form.damageDeductionAmount} onChange={e => setForm(f => ({ ...f, damageDeductionAmount: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, borderColor: '#C97B3D' }} />
              <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '3px' }}>= {formatPrice(form.damageDeductionAmount)}</div>
            </div>
          )}
        </div>

        {/* Read-only: late fee info */}
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '16px' }}>
          <SectionLabel>Late Return Info (read-only)</SectionLabel>
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <ReadOnlyField label="Returned late by" value={`${lateByMinutes} minutes`} />
            <ReadOnlyField label="Late fee calculated" value={formatPrice(lateFee)} />
            <ReadOnlyField label="Grace period" value={`${lateFeeRule.gracePeriodHours}h`} />
            <ReadOnlyField label="Rate type" value={`${lateFeeRule.rateType} — ${formatPrice(lateFeeRule.rateAmount)}/unit`} />
          </div>
        </div>

        {/* Live summary receipt */}
        <div style={{ background: '#BFCFBB', border: '1px solid #8EA58C', borderRadius: '10px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#344C3D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Settlement Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <ReceiptRow label="Deposit Held" value={formatPrice(depositHeld)} />
            <ReceiptRow label="Late Fee" value={`− ${formatPrice(lateFee)}`} colored={lateFee > 0} />
            <ReceiptRow label="Damage Deduction" value={`− ${formatPrice(damageDeduction)}`} colored={damageDeduction > 0} />
            <div style={{ borderTop: '1px solid #8EA58C', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#344C3D', fontSize: '14px' }}>Refund to Customer</span>
              <span style={{ fontWeight: 800, color: '#344C3D', fontSize: '24px', letterSpacing: '-0.02em' }}>{formatPrice(refundAmount)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={submitting} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: submitting ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…' : 'Submit Inspection & Settle Deposit'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</div>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#F0F3EF', borderRadius: '6px', padding: '8px 10px' }}>
      <div style={{ fontSize: '10px', color: '#8EA58C', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{value}</div>
    </div>
  );
}

function ReceiptRow({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
      <span style={{ color: '#344C3D' }}>{label}</span>
      <span style={{ fontWeight: 600, color: colored ? '#C97B3D' : '#344C3D' }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };