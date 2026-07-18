import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPassword() {
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(115,138,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={26} color="#738A6E" />
        </div>
        <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '8px' }}>Password reset</h2>
        <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '24px' }}>Your password has been updated successfully.</p>
        <Link to="/login" style={{ display: 'inline-block', padding: '9px 24px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px' }}>Set new password</h2>
      <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '28px' }}>Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Field label="New Password">
          <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 8 characters" required minLength={8} style={inputStyle} />
        </Field>
        <Field label="Confirm Password">
          <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" required style={inputStyle} />
        </Field>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: loading ? '#A9C2A4' : '#738A6E', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
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

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '14px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' };
