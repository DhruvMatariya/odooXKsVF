import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { PRODUCTS, CATEGORIES } from '../../lib/mockData';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export function AddEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const existing = isEdit ? PRODUCTS.find(p => p.id === id) : null;

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    description: existing?.description ?? '',
    brand: existing?.brand ?? '',
    manufacturer: existing?.manufacturer ?? '',
    categoryId: existing?.categoryId ?? '',
    thumbnail: existing?.thumbnail ?? '',
  });

  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully');
    navigate('/vendor/products');
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}>
        <ArrowLeft size={15} /> Back to products
      </button>

      <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '24px' }}>
        {isEdit ? 'Edit Product' : 'Add New Product'}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionTitle>Basic Info</SectionTitle>
          <Field label="Category">
            <select value={form.categoryId} onChange={e => update('categoryId', e.target.value)} required style={inputStyle}>
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Product Name">
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Sony Alpha A7 III" required style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} placeholder="Describe the product, what's included, condition…" style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Brand">
              <input value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="e.g. Sony" style={inputStyle} />
            </Field>
            <Field label="Manufacturer">
              <input value={form.manufacturer} onChange={e => update('manufacturer', e.target.value)} placeholder="e.g. Sony Corporation" style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SectionTitle>Images</SectionTitle>
          <Field label="Thumbnail (primary image)">
            <div style={{ border: '2px dashed #E4E7E2', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8' }}>
              {form.thumbnail ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.thumbnail} alt="Thumbnail" style={{ height: '80px', borderRadius: '6px', objectFit: 'cover' }} />
                  <button onClick={() => update('thumbnail', '')} type="button" style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#344C3D', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Upload size={24} color="#BFCFBB" />
                  <span style={{ fontSize: '13px', color: '#8EA58C' }}>Click to upload thumbnail</span>
                  <span style={{ fontSize: '11px', color: '#BFCFBB' }}>PNG, JPG up to 5MB</span>
                </div>
              )}
            </div>
          </Field>

          <Field label="Product Images (multi-upload)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ aspectRatio: '1', border: '2px dashed #E4E7E2', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAF8', gap: '4px' }}>
                  <Upload size={16} color="#BFCFBB" />
                  <span style={{ fontSize: '10px', color: '#BFCFBB' }}>Add</span>
                </div>
              ))}
            </div>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
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
