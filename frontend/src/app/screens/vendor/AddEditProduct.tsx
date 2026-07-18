import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { getCategories, getProductById, createProduct, updateProduct } from '../../lib/api';

export function AddEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    brand: '',
    manufacturer: '',
    categoryId: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadCategories();
    if (isEdit && id) loadProduct(id);
  }, [id, isEdit]);

  async function loadCategories() {
    try {
      const res = await getCategories();
      if (res.data) setCategories(res.data);
    } catch (e) {
      toast.error('Failed to load categories');
    }
  }

  async function loadProduct(productId: string) {
    try {
      const res = await getProductById(productId);
      if (res.data?.data) {
        const p = res.data.data;
        setForm({
          name: p.name || '',
          description: p.description || '',
          brand: p.brand || '',
          manufacturer: p.manufacturer || '',
          categoryId: p.category?.id || '',
        });
        if (p.thumbnail) setThumbnailPreview(p.thumbnail);
        if (p.images?.length) setImagePreviews(p.images.map((img: any) => img.url || img));
      }
    } catch (e) {
      toast.error('Failed to load product');
    } finally {
      setInitialLoad(false);
    }
  }

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const url = URL.createObjectURL(file);
      setThumbnailPreview(url);
    }
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    const urls = files.map(f => URL.createObjectURL(f));
    setImagePreviews(urls);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('brand', form.brand);
      formData.append('manufacturer', form.manufacturer);
      formData.append('categoryId', form.categoryId);

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      imageFiles.forEach(file => {
        formData.append('images', file);
      });

      if (isEdit && id) {
        await updateProduct(id, formData);
      } else {
        await createProduct(formData);
      }
      toast.success(isEdit ? 'Product updated successfully' : 'Product created successfully');
      navigate('/vendor/products');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%' }}>
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
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <div style={{ border: '2px dashed #E4E7E2', borderRadius: '8px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#FAFAF8' }} onClick={() => document.getElementById('thumbnail-input')?.click()}>
              {thumbnailPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={thumbnailPreview} alt="Thumbnail" style={{ height: '80px', borderRadius: '6px', objectFit: 'cover' }} />
                  <button onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreview(''); }} type="button" style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#344C3D', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
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
              <input id="thumbnail-input" type="file" accept="image/*" onChange={handleThumbnailChange} style={{ display: 'none' }} />
            </div>
          </Field>

          <Field label="Product Images (multi-upload)">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {imagePreviews.map((url, i) => (
                <div key={i} style={{ aspectRatio: '1', border: '2px solid #E4E7E2', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  <img src={url} alt={`Product ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => {
                    const newFiles = [...imageFiles];
                    newFiles.splice(i, 1);
                    setImageFiles(newFiles);
                    const newPreviews = [...imagePreviews];
                    newPreviews.splice(i, 1);
                    setImagePreviews(newPreviews);
                  }} style={{ position: 'absolute', top: '4px', right: '4px', background: '#344C3D', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imagePreviews.length < 4 && (
                <label style={{ aspectRatio: '1', border: '2px dashed #E4E7E2', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#FAFAF8', gap: '4px' }}>
                  <Upload size={16} color="#BFCFBB" />
                  <span style={{ fontSize: '10px', color: '#BFCFBB' }}>Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleImagesChange} style={{ display: 'none' }} />
                </label>
              )}
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
