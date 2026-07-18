import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PRODUCTS } from '../../lib/mockData';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice, formatPricingLabel } from '../../lib/utils';
import type { PricingTier } from '../../lib/types';

export function AddOfflineOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    productId: '',
    pricingId: '',
    quantity: 1,
    customerEmail: '',
    rentalPeriodStart: '',
    rentalPeriodEnd: '',
    deliveryType: 'PICKUP' as 'PICKUP' | 'DELIVERY',
  });
  const [loading, setLoading] = useState(false);

  const selectedProduct = PRODUCTS.find(p => p.id === form.productId);
  const pricingOptions: PricingTier[] = selectedProduct?.pricing ?? [];
  const selectedPricing = pricingOptions.find(p => p.id === form.pricingId);

  function update(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value, ...(field === 'productId' ? { pricingId: '' } : {}) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    toast.success('Offline order created successfully');
    navigate('/vendor/orders');
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to orders
      </button>

      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '24px' }}>Add Offline Order</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionLabel>Product & Pricing</SectionLabel>

          <Field label="Product">
            <select value={form.productId} onChange={e => update('productId', e.target.value)} required style={inputStyle}>
              <option value="">Search and select a product…</option>
              {PRODUCTS.filter(p => p.status === 'ACTIVE').map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
              ))}
            </select>
          </Field>

          <Field label="Pricing Tier">
            <select value={form.pricingId} onChange={e => update('pricingId', e.target.value)} required disabled={!form.productId} style={{ ...inputStyle, color: !form.productId ? '#BFCFBB' : '#1A1A1A' }}>
              <option value="">{form.productId ? 'Select pricing tier…' : 'Select a product first'}</option>
              {pricingOptions.map(p => (
                <option key={p.id} value={p.id}>{formatPricingLabel(p.period, p.duration)} — {formatPrice(p.price)} rental + {formatPrice(p.deposit)} deposit</option>
              ))}
            </select>
          </Field>

          {selectedPricing && (
            <div style={{ background: '#F0F3EF', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#344C3D' }}>
              Selected: <strong>{formatPricingLabel(selectedPricing.period, selectedPricing.duration)}</strong> — Rental: {formatPrice(selectedPricing.price)}, Deposit: {formatPrice(selectedPricing.deposit)}
            </div>
          )}

          <Field label="Quantity">
            <input type="number" min={1} max={selectedProduct?.inventory.available ?? 99} value={form.quantity} onChange={e => update('quantity', parseInt(e.target.value) || 1)} required style={inputStyle} />
            {selectedProduct && <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '3px' }}>{selectedProduct.inventory.available} units available</div>}
          </Field>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionLabel>Customer & Schedule</SectionLabel>

          <Field label="Customer Email">
            <input type="email" value={form.customerEmail} onChange={e => update('customerEmail', e.target.value)} placeholder="customer@example.com" required style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Rental Start">
              <input type="datetime-local" value={form.rentalPeriodStart} onChange={e => update('rentalPeriodStart', e.target.value)} required style={inputStyle} />
            </Field>
            <Field label="Rental End">
              <input type="datetime-local" value={form.rentalPeriodEnd} onChange={e => update('rentalPeriodEnd', e.target.value)} required style={inputStyle} />
            </Field>
          </div>

          <Field label="Delivery Type">
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['PICKUP', 'DELIVERY'] as const).map(dt => (
                <button key={dt} type="button" onClick={() => update('deliveryType', dt)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${form.deliveryType === dt ? '#738A6E' : '#E4E7E2'}`, background: form.deliveryType === dt ? 'rgba(115,138,110,0.08)' : '#fff', color: form.deliveryType === dt ? '#344C3D' : '#8EA58C', fontWeight: form.deliveryType === dt ? 600 : 400, fontSize: '13px', cursor: 'pointer' }}>
                  {dt === 'PICKUP' ? 'Pickup' : 'Delivery'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
