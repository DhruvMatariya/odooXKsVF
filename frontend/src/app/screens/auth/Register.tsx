import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { UserRole } from '../../lib/types';
import { User, Building2, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const CATEGORIES_API = '/categories';

export function Register() {
  const [categories, setCategories] = useState<string[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    companyName: '', gstNumber: '', productCategory: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const json = await apiFetch<{ id: string; name: string }[]>(CATEGORIES_API);
        if (json.data) {
          setCategories(json.data.map((c) => c.name).filter(Boolean));
        }
      } catch {
        setCategories([]);
      }
    }

    fetchCategories();
  }, []);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);

    try {
      const payload: any = {
        full_name: form.fullName,
        email: form.email.trim(),
        password: form.password,
        role,
      };

      // For vendor, we will create profile after login, so just register as vendor
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('Account created! Please verify your email.');
      navigate('/verify-email', { state: { email: form.email.trim() } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // Step 1 — choose role
  if (!role) {
    return (
      <div>
        <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px', textAlign: 'center' }}>
          Create your account
        </h2>
       

        <p style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '14px' }}>I want to sign up as:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <RoleCard
            icon={<User size={22} color="#738A6E" />}
            title="Customer"
            description="Browse and rent products from vendors"
            onClick={() => setRole('customer')}
          />
          <RoleCard
            icon={<Building2 size={22} color="#738A6E" />}
            title="Vendor"
            description="List products, manage inventory and orders"
            onClick={() => setRole('vendor')}
          />
        </div>
        <br></br>
         <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: '#738A6E', fontWeight: 600 }}>Sign in</Link>
      </p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#BFCFBB', marginTop: '24px' }}>
          Your role is permanent and cannot be changed later
        </p>
      </div>
    );
  }

  // Step 2 — fill details for chosen role
  return (
    <div>
      <button
        onClick={() => setRole(null)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#738A6E', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', padding: 0 }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '6px' }}>
        <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em' }}>
          {role === 'CUSTOMER' ? 'Customer' : 'Vendor'} Registration
        </h2>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'rgba(115,138,110,0.12)', color: '#4a6848' }}>
          {role}
        </span>
      </div>
     

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Common fields (both roles) */}
        <Field label="Full Name">
          <input type="text" value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Your full name" required minLength={2} maxLength={150} style={inputStyle} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" required style={inputStyle} />
        </Field>
        <Field label="Password">
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 8 characters" required minLength={8} style={{ ...inputStyle, paddingRight: '40px' }} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C', padding: 0, display: 'flex' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {/* Vendor-only fields */}
        {role === 'VENDOR' && (
          <>
            <div style={{ borderTop: '1px solid #E4E7E2', paddingTop: '14px', marginTop: '2px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#8EA58C', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Business Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Company Name">
                  <input type="text" value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Your company or trade name" required minLength={2} maxLength={150} style={inputStyle} />
                </Field>
                <Field label="GST Number">
                  <input
                    type="text" value={form.gstNumber}
                    onChange={e => update('gstNumber', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                    style={inputStyle}
                  />
                  <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '4px' }}>
                    Format: 22AAAAA0000A1Z5 (15-character GSTIN)
                  </div>
                </Field>
                <Field label="Product Category">
                  <select value={form.productCategory} onChange={e => update('productCategory', e.target.value)} required={role === 'VENDOR'} style={inputStyle}>
                    <option value="">Select your primary category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px',
            background: loading ? '#A9C2A4' : '#738A6E',
            color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '6px',
          }}
        >
          {loading ? 'Creating account…' : `Create ${role === 'CUSTOMER' ? 'Customer' : 'Vendor'} Account`}
        </button>
        
      </form>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 18px', borderRadius: '10px',
        border: '1px solid #E4E7E2', background: '#fff',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#738A6E';
        (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF8';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#E4E7E2';
        (e.currentTarget as HTMLButtonElement).style.background = '#fff';
      }}
    >
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(115,138,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: '#344C3D', fontSize: '14px', marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#8EA58C' }}>{description}</div>
      </div>
      <div style={{ color: '#BFCFBB', fontSize: '18px' }}>→</div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #E4E7E2', background: '#fff',
  fontSize: '14px', color: '#1A1A1A', outline: 'none',
  boxSizing: 'border-box',
};
