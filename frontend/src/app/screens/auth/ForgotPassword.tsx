import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(115,138,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={26} color="#738A6E" />
        </div>
        <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '8px' }}>Check your inbox</h2>
        <p style={{ color: '#738A6E', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          If an account exists for <strong>{email}</strong>, we've sent a password reset link.
        </p>
        <Link to="/login" style={{ fontSize: '13px', color: '#738A6E', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
        Forgot your password?
      </h2>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
        Enter your email address and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '14px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit" disabled={loading}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link to="/login" style={{ fontSize: '13px', color: '#738A6E', textDecoration: 'none', fontWeight: 500 }}>← Back to sign in</Link>
      </div>
    </div>
  );
}
