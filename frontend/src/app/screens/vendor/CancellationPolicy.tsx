import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { upsertCancellationPolicy } from '../../lib/api';

export function CancellationPolicy() {
  const [form, setForm] = useState({
    fullRefundHoursBefore: 48,
    partialRefundHoursBefore: 24,
    partialRefundPercent: 50,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // TODO: fetch existing policy (get endpoint)
    setInitialLoad(false);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await upsertCancellationPolicy(form);
      toast.success('Cancellation policy updated');
    } catch (e) {
      toast.error('Failed to update cancellation policy');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '6px' }}>Cancellation Policy</h1>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px' }}>Define your refund policy for cancelled orders.</p>

      <form onSubmit={handleSave}>
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Field label="Full Refund if Cancelled (hours before start)" description="Customer gets 100% refund if they cancel this many hours before rental start">
            <input type="number" min={0} value={form.fullRefundHoursBefore} onChange={e => setForm(f => ({ ...f, fullRefundHoursBefore: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          </Field>

          <Field label="Partial Refund if Cancelled (hours before start)" description="Customer gets partial refund if cancelled between this and the full refund window">
            <input type="number" min={0} value={form.partialRefundHoursBefore} onChange={e => setForm(f => ({ ...f, partialRefundHoursBefore: parseInt(e.target.value) || 0 }))} style={inputStyle} />
          </Field>

          <Field label={`Partial Refund Percent: ${form.partialRefundPercent}%`} description="What percentage of the rental fee is refunded for late cancellations">
            <input
              type="range" min={0} max={100} value={form.partialRefundPercent}
              onChange={e => setForm(f => ({ ...f, partialRefundPercent: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: '#738A6E' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#BFCFBB', marginTop: '4px' }}>
              <span>0% (No refund)</span>
              <span>100% (Full refund)</span>
            </div>
          </Field>

          {/* Policy summary */}
          <div style={{ background: '#BFCFBB', border: '1px solid #8EA58C', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#344C3D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Policy Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PolicyRow window="More than" hours={form.fullRefundHoursBefore} refund={100} />
              <PolicyRow window="Between" hours={form.partialRefundHoursBefore} hoursEnd={form.fullRefundHoursBefore} refund={form.partialRefundPercent} />
              <PolicyRow window="Less than" hours={form.partialRefundHoursBefore} refund={0} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving…' : 'Save Policy'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PolicyRow({ window, hours, hoursEnd, refund }: { window: string; hours: number; hoursEnd?: number; refund: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
      <span style={{ color: '#344C3D' }}>
        {window} {hoursEnd ? `${hours}–${hoursEnd}h` : `${hours}h`} before
      </span>
      <span style={{ fontWeight: 700, color: refund === 0 ? '#C97B3D' : '#344C3D' }}>{refund}% refund</span>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '4px' }}>{label}</label>
      {description && <div style={{ fontSize: '11px', color: '#8EA58C', marginBottom: '6px' }}>{description}</div>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
