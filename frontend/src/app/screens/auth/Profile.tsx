import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';
import { apiFetch, getCategories } from '../../lib/api';

export function Profile() {
  const { user, login, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    companyName: user?.companyName ?? '',
    gstNumber: user?.gstNumber ?? '',
    productCategory: user?.productCategory ?? '',
    address: user?.address ?? '',
  });
  const [creatingVendorProfile, setCreatingVendorProfile] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    companyName: '',
    gstNumber: '',
    productCategory: '',
  });
  const [categories, setCategories] = useState<string[]>([]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!user) return;
    await new Promise(r => setTimeout(r, 400));
    login({ ...user, ...form });
    toast.success('Profile updated successfully');
    setEditing(false);
  }

  function handleCancel() {
    setForm({
      fullName: user?.fullName ?? '',
      companyName: user?.companyName ?? '',
      gstNumber: user?.gstNumber ?? '',
      productCategory: user?.productCategory ?? '',
      address: user?.address ?? '',
    });
    setEditing(false);
  }

  async function handleCreateVendorProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      await apiFetch('/vendor/profile', {
        method: 'POST',
        body: JSON.stringify({
          companyName: vendorForm.companyName,
          gstNumber: vendorForm.gstNumber,
          productCategory: vendorForm.productCategory,
        }),
      });
      toast.success('Vendor profile created');
      setCreatingVendorProfile(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await getCategories();
        if (res.data) {
          setCategories(res.data.map((c: any) => c.name));
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCategories();
  }, []);

  if (!user) return null;

  const isMockUser = user.id.startsWith('mock-');

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>Profile</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>Manage your account information</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <Edit2 size={14} />
              Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                <X size={14} />
                Cancel
              </button>
              <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#738A6E', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                <Check size={14} />
                Save
              </button>
            </>
          )}
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7E2' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Account Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ProfileField label="Full Name" editing={editing}>
              {editing
                ? <input value={form.fullName} onChange={e => update('fullName', e.target.value)} style={inputStyle} />
                : <span>{user.full_name}</span>}
            </ProfileField>
            <ProfileField label="Email" editing={false}>
              <span style={{ color: '#8EA58C' }}>{user.email}</span>
              <span style={{ fontSize: '11px', color: '#BFCFBB', marginLeft: '8px' }}>(read-only)</span>
            </ProfileField>
            <ProfileField label="Role" editing={false}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: user.role === 'vendor' ? 'rgba(115,138,110,0.12)' : 'rgba(52,76,61,0.1)',
                color: '#344C3D',
                textTransform: 'capitalize',
              }}>
                {user.role}
              </span>
            </ProfileField>
            {(user.role === 'customer' || user.role === 'CUSTOMER') && (
              <ProfileField label="Address" editing={editing}>
                {editing
                  ? <textarea value={form.address} onChange={e => update('address', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
                  : <span style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{user.address || 'No address provided'}</span>}
              </ProfileField>
            )}
          </div>
        </div>

        {(user.role === 'vendor' || user.role === 'VENDOR') && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Vendor Details</div>
            {isMockUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ProfileField label="Company Name" editing={editing}>
                  {editing
                    ? <input value={form.companyName} onChange={e => update('companyName', e.target.value)} style={inputStyle} />
                    : <span>{user.companyName || 'Demo Rental Company'}</span>}
                </ProfileField>
                <ProfileField label="GST Number" editing={editing}>
                  {editing
                    ? <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value.toUpperCase())} maxLength={15} style={inputStyle} />
                    : <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{user.gstNumber || '22AAAAA0000A1Z5'}</span>}
                </ProfileField>
                <ProfileField label="Product Category" editing={editing}>
                  {editing
                    ? <select value={form.productCategory} onChange={e => update('productCategory', e.target.value)} style={inputStyle}>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    : <span>{user.productCategory || 'Electronics'}</span>}
                </ProfileField>
              </div>
            ) : !user.vendorProfile ? (
              <div>
                {!creatingVendorProfile ? (
                  <button onClick={() => setCreatingVendorProfile(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#738A6E', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                    Create Vendor Profile
                  </button>
                ) : (
                  <form onSubmit={handleCreateVendorProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <ProfileField label="Company Name" editing={true}>
                      <input
                        value={vendorForm.companyName}
                        onChange={(e) => setVendorForm({ ...vendorForm, companyName: e.target.value })}
                        placeholder="Your company name"
                        required
                        style={inputStyle}
                      />
                    </ProfileField>
                    <ProfileField label="GST Number" editing={true}>
                      <input
                        value={vendorForm.gstNumber}
                        onChange={(e) => setVendorForm({ ...vendorForm, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        required
                        style={inputStyle}
                      />
                    </ProfileField>
                    <ProfileField label="Product Category" editing={true}>
                      <select
                        value={vendorForm.productCategory}
                        onChange={(e) => setVendorForm({ ...vendorForm, productCategory: e.target.value })}
                        required
                        style={inputStyle}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </ProfileField>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setCreatingVendorProfile(false)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#738A6E', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ProfileField label="Company Name" editing={editing}>
                  {editing
                    ? <input value={form.companyName} onChange={e => update('companyName', e.target.value)} style={inputStyle} />
                    : <span>{user.vendorProfile.company_name}</span>}
                </ProfileField>
                <ProfileField label="GST Number" editing={editing}>
                  {editing
                    ? <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value.toUpperCase())} maxLength={15} style={inputStyle} />
                    : <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{user.vendorProfile.gst_number}</span>}
                </ProfileField>
                <ProfileField label="Product Category" editing={editing}>
                  {editing
                    ? <select value={form.productCategory} onChange={e => update('productCategory', e.target.value)} style={inputStyle}>
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    : <span>{user.vendorProfile.product_category}</span>}
                </ProfileField>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, editing, children }: { label: string; editing: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#738A6E' }}>{label}</span>
      <div style={{ fontSize: '14px', color: '#1A1A1A' }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '14px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
