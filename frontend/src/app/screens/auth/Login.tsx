import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Info, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// Mock user store — keyed by email; role comes from here, not from a UI toggle
const MOCK_USERS: Record<string, { id: string; fullName: string; email: string; role: 'CUSTOMER' | 'VENDOR'; companyName?: string; gstNumber?: string; productCategory?: string }> = {
  'demo.customer@rentsure.app': {
    id: 'usr-1', fullName: 'Arjun Mehta',
    email: 'demo.customer@rentsure.app', role: 'CUSTOMER',
  },
  'demo.vendor@rentsure.app': {
    id: 'usr-2', fullName: 'Priya Sharma',
    email: 'demo.vendor@rentsure.app', role: 'VENDOR',
    companyName: 'ProGear Rentals Pvt. Ltd.',
    gstNumber: '22AAAAA0000A1Z5',
    productCategory: 'Cameras & Photography',
  },
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Simulate POST /api/v1/auth/login — { email, password }
    // Backend returns { token, refreshToken, user } — role is embedded in user, not a request field
    await new Promise(r => setTimeout(r, 600));

    const user = MOCK_USERS[email.toLowerCase().trim()];
    if (user && password === 'Demo@1234') {
      login(user);
      toast.success('Welcome back!');
      // Redirect based on role returned by backend
      navigate(user.role === 'VENDOR' ? '/vendor/dashboard' : '/customer/products');
    } else {
      toast.error('Invalid email or password');
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 style={{ color: '#344C3D',textAlign: 'center', fontWeight: 700, fontSize: '32px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
        Sign in
      </h1>

      {/* Premium Demo Credentials */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
          <div style={{ width: '28px', height: '1px', background: 'rgba(115,138,110,0.3)' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Demo Access</span>
          <div style={{ width: '28px', height: '1px', background: 'rgba(115,138,110,0.3)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <DemoCard
            label="Customer"
            email="demo.customer@rentsure.app"
            onUse={() => { setEmail('demo.customer@rentsure.app'); setPassword('Demo@1234'); }}
          />
          <DemoCard
            label="Vendor"
            email="demo.vendor@rentsure.app"
            onUse={() => { setEmail('demo.vendor@rentsure.app'); setPassword('Demo@1234'); }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoComplete="email"
            style={inputStyle}
          />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: '#738A6E', textDecoration: 'none', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="current-password"
              style={{ ...inputStyle, paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8EA58C', padding: 0, display: 'flex' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: '8px',
            background: loading ? '#A9C2A4' : '#738A6E',
            color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '28px' }}>
        New here? <Link to="/register" style={{ color: '#738A6E', fontWeight: 600 }}>Create an account</Link>
      </p>
      </form>
    </div>
  );
}

function DemoCard({ label, email, onUse }: { label: string; email: string; onUse: () => void }) {
  return (
    <button
      type="button" onClick={onUse}
      style={{ 
        background: 'rgba(255, 255, 255, 0.4)', 
        border: '1px solid rgba(115,138,110,0.2)', 
        borderRadius: '12px', padding: '12px',
        textAlign: 'left', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(52,76,61,0.02)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
        e.currentTarget.style.borderColor = 'rgba(115,138,110,0.4)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
        e.currentTarget.style.borderColor = 'rgba(115,138,110,0.2)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#344C3D', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '10px', color: '#738A6E', fontFamily: 'monospace', marginBottom: '2px', wordBreak: 'break-all' }}>{email}</div>
      <div style={{ fontSize: '10px', color: '#BFCFBB', fontFamily: 'monospace' }}>Demo@1234</div>
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #E4E7E2', background: '#fff',
  fontSize: '14px', color: '#1A1A1A', outline: 'none',
  boxSizing: 'border-box',
};
