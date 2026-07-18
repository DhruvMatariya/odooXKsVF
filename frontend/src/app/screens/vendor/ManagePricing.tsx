import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PricingTierCard } from '../../components/shared/PricingTierCard';
import type { PricingTier } from '../../lib/types';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '../../lib/utils';
import { getProductById, getPricing, createPricing, updatePricing, deletePricing } from '../../lib/api';

export function ManagePricing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editTier, setEditTier] = useState<PricingTier | null>(null);
  const [form, setForm] = useState({ period: 'DAY' as 'HOUR' | 'DAY' | 'WEEK', duration: 1, price: 0, deposit: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(productId: string) {
    try {
      const [productRes, pricingRes] = await Promise.all([
        getProductById(productId),
        getPricing(productId)
      ]);
      if (productRes.data) setProduct(productRes.data);
      if (pricingRes.data) setTiers(pricingRes.data);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setInitialLoad(false);
    }
  }

  async function handleSaveTier() {
    if (!id) return;
    setLoading(true);
    try {
      if (editTier) {
        await updatePricing(editTier.id, form);
        toast.success('Pricing tier updated');
      } else {
        await createPricing(id, form);
        toast.success('Pricing tier added');
      }
      await loadData(id);
      setShowAdd(false);
      setEditTier(null);
      setForm({ period: 'DAY', duration: 1, price: 0, deposit: 0 });
    } catch (e) {
      toast.error('Failed to save tier');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(tierId: string) {
    setLoading(true);
    try {
      await deletePricing(tierId);
      toast.success('Pricing tier removed');
      if (id) await loadData(id);
    } catch (e) {
      toast.error('Failed to delete tier');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(tier: PricingTier) {
    setEditTier(tier);
    setForm({ period: tier.period, duration: tier.duration, price: tier.price, deposit: tier.deposit });
    setShowAdd(true);
  }

  if (initialLoad) {
    return (
      <div style={{ color: '#8EA58C', padding: '32px', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  if (!product) return <div style={{ color: '#8EA58C', padding: '32px' }}>Product not found</div>;

  return (
    <div style={{ width: '100%' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Manage Pricing</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>{product.name}</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditTier(null); setForm({ period: 'DAY', duration: 1, price: 0, deposit: 0 }); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#738A6E', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Tier
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div style={{ background: '#FAFAF8', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{editTier ? 'Edit Pricing Tier' : 'New Pricing Tier'}</span>
            <button onClick={() => { setShowAdd(false); setEditTier(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <FormField label="Period">
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as any }))} style={inputStyle}>
                <option value="HOUR">Hour</option>
                <option value="DAY">Day</option>
                <option value="WEEK">Week</option>
              </select>
            </FormField>
            <FormField label="Duration">
              <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 1 }))} style={inputStyle} />
            </FormField>
            <FormField label="Price (in paise)">
              <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} style={inputStyle} />
              <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '3px' }}>= {formatPrice(form.price)}</div>
            </FormField>
            <FormField label="Deposit (in paise)">
              <input type="number" min={0} value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: parseInt(e.target.value) || 0 }))} style={inputStyle} />
              <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '3px' }}>= {formatPrice(form.deposit)}</div>
            </FormField>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => { setShowAdd(false); setEditTier(null); }} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSaveTier} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', background: '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{editTier ? 'Update' : 'Add'}</button>
          </div>
        </div>
      )}

      {/* Tiers list */}
      {tiers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8EA58C', border: '1px dashed #E4E7E2', borderRadius: '10px' }}>
          No pricing tiers yet. Add one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tiers.map(tier => (
            <PricingTierCard
              key={tier.id}
              pricing={tier}
              showActions
              onEdit={() => startEdit(tier)}
              onDelete={() => handleDelete(tier.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#344C3D', marginBottom: '5px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '13px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
