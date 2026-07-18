import { useState } from 'react';
import { toast } from 'sonner';
import { formatPrice } from '../../lib/utils';

export function LateFeeRules() {
  const [form, setForm] = useState({
    gracePeriodHours: 2,
    rateType: 'HOURLY' as 'HOURLY' | 'DAILY',
    rateAmount: 15000,
    maxCap: 150000,
  });
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    toast.success('Late fee rule updated');
    setLoading(false);
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '6px' }}>Late Fee Rules</h1>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px' }}>Define how late return fees are calculated for your rentals.</p>

      <form onSubmit={handleSave}>
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Field label="Grace Period (hours)" description="Customer has this many hours after end time before fees apply">
            <input
              type="number" min={0} value={form.gracePeriodHours}
              onChange={e => setForm(f => ({ ...f, gracePeriodHours: parseInt(e.target.value) || 0 }))}
              style={inputStyle}
            />
          </Field>

          <Field label="Rate Type" description="Whether fees are charged per hour or per day overdue">
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['HOURLY', 'DAILY'] as const).map(rt => (
                <button key={rt} type="button" onClick={() => setForm(f => ({ ...f, rateType: rt }))} style={{
                  flex: 1, padding: '8px', borderRadius: '8px',
                  border: `1px solid ${form.rateType === rt ? '#738A6E' : '#E4E7E2'}`,
                  background: form.rateType === rt ? 'rgba(115,138,110,0.08)' : '#fff',
                  color: form.rateType === rt ? '#344C3D' : '#8EA58C',
                  fontWeight: form.rateType === rt ? 600 : 400, fontSize: '13px', cursor: 'pointer',
                }}>
                  {rt}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Rate Amount (₹ per ${form.rateType === 'HOURLY' ? 'hour' : 'day'}) — enter in paise`} description={`Current: ${formatPrice(form.rateAmount)} per ${form.rateType === 'HOURLY' ? 'hour' : 'day'}`}>
            <input
              type="number" min={0} value={form.rateAmount}
              onChange={e => setForm(f => ({ ...f, rateAmount: parseInt(e.target.value) || 0 }))}
              style={inputStyle}
            />
          </Field>

          <Field label="Maximum Cap (paise)" description={`Maximum late fee that can be charged: ${formatPrice(form.maxCap)}`}>
            <input
              type="number" min={0} value={form.maxCap}
              onChange={e => setForm(f => ({ ...f, maxCap: parseInt(e.target.value) || 0 }))}
              style={inputStyle}
            />
          </Field>

          {/* Preview */}
          <div style={{ background: '#BFCFBB', border: '1px solid #8EA58C', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#344C3D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Rule Preview</div>
            <div style={{ fontSize: '13px', color: '#344C3D', lineHeight: 1.6 }}>
              Grace period of <strong>{form.gracePeriodHours}h</strong>, then{' '}
              <strong>{formatPrice(form.rateAmount)}</strong> per {form.rateType === 'HOURLY' ? 'hour' : 'day'}{' '}
              overdue, capped at <strong>{formatPrice(form.maxCap)}</strong>.
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </form>
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
