import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { User } from '../../lib/types';

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

    try {
      const data = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      login(data.data!.user, data.data!.accessToken, data.data!.refreshToken);
      toast.success('Welcome back!');
      navigate(data.data!.user.role === 'vendor' ? '/vendor/dashboard' : '/customer/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ color: '#344C3D',textAlign: 'center', fontWeight: 700, fontSize: '32px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
        Sign in
      </h1>

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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #E4E7E2', background: '#fff',
  fontSize: '14px', color: '#1A1A1A', outline: 'none',
  boxSizing: 'border-box',
};
