import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';

export function Profile() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    companyName: user?.companyName ?? '',
    gstNumber: user?.gstNumber ?? '',
    productCategory: user?.productCategory ?? '',
    address: user?.address ?? '',
  });

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

  if (!user) return null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>Profile</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>Manage your account information</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            <Edit2 size={14} /> Edit
          </button>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: '13px' }}>
              <X size={14} /> Cancel
            </button>
            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#738A6E', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <Check size={14} /> Save
            </button>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7E2' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Account Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ProfileField label="Full Name" editing={editing}>
              {editing
                ? <input value={form.fullName} onChange={e => update('fullName', e.target.value)} style={inputStyle} />
                : <span>{user.fullName}</span>}
            </ProfileField>
            <ProfileField label="Email" editing={false}>
              <span style={{ color: '#8EA58C' }}>{user.email}</span>
              <span style={{ fontSize: '11px', color: '#BFCFBB', marginLeft: '8px' }}>(read-only)</span>
            </ProfileField>
            <ProfileField label="Role" editing={false}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                background: user.role === 'VENDOR' ? 'rgba(115,138,110,0.12)' : 'rgba(52,76,61,0.1)',
                color: '#344C3D',
              }}>
                {user.role}
              </span>
            </ProfileField>
            {user.role === 'CUSTOMER' && (
              <ProfileField label="Address" editing={editing}>
                {editing
                  ? <textarea value={form.address} onChange={e => update('address', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
                  : <span style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{user.address || 'No address provided'}</span>}
              </ProfileField>
            )}
          </div>
        </div>

        {user.role === 'VENDOR' && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Vendor Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ProfileField label="Company Name" editing={editing}>
                {editing
                  ? <input value={form.companyName} onChange={e => update('companyName', e.target.value)} style={inputStyle} />
                  : <span>{user.companyName || '—'}</span>}
              </ProfileField>
              <ProfileField label="GST Number" editing={editing}>
                {editing
                  ? <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value.toUpperCase())} style={inputStyle} />
                  : <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{user.gstNumber || '—'}</span>}
              </ProfileField>
              <ProfileField label="Product Category" editing={editing}>
                {editing
                  ? (
                    <select value={form.productCategory} onChange={e => update('productCategory', e.target.value)} style={inputStyle}>
                      <option value="">Select…</option>
                      {['Cameras & Photography', 'Power Tools', 'Party & Events', 'Vehicles & Mobility', 'Electronics', 'Sports & Outdoor', 'Furniture & Decor', 'Musical Instruments'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )
                  : <span>{user.productCategory || '—'}</span>}
              </ProfileField>
            </div>
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
