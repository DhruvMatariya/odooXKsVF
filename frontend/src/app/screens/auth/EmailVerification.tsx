import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

type VerificationState = 'idle' | 'loading' | 'verified' | 'invalid' | 'expired';

export function EmailVerification() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<VerificationState>('idle');
  const [tokenInput, setTokenInput] = useState(params.get('token') || '');

  useEffect(() => {
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [params]);

  async function handleVerify(token: string) {
    if (!token) {
      toast.error('Verification token is required');
      return;
    }
    setStatus('loading');
    try {
      await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      setStatus('verified');
    } catch (error: any) {
      if (error.message?.includes('expired')) {
        setStatus('expired');
      } else {
        setStatus('invalid');
      }
    }
  }

  const states = {
    idle: {
      showInput: true,
    },
    loading: {
      showLoading: true,
    },
    verified: {
      icon: <CheckCircle size={32} color="#738A6E" />,
      bg: 'rgba(115,138,110,0.1)',
      title: 'Email verified!',
      message: 'Your email address has been successfully verified. You can now sign in to your account.',
      action: <Link to="/login" style={{ display: 'inline-block', padding: '9px 24px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Sign in</Link>,
    },
    invalid: {
      icon: <XCircle size={32} color="#C97B3D" />,
      bg: 'rgba(201,123,61,0.1)',
      title: 'Invalid verification link',
      message: 'This verification link is invalid or has already been used. Please request a new one.',
      action: <Link to="/login" style={{ fontSize: '13px', color: '#738A6E', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</Link>,
    },
    expired: {
      icon: <Clock size={32} color="#C97B3D" />,
      bg: 'rgba(201,123,61,0.1)',
      title: 'Link expired',
      message: 'This verification link has expired. Links are valid for 24 hours. Please sign up again to receive a new link.',
      action: <Link to="/register" style={{ display: 'inline-block', padding: '9px 24px', borderRadius: '8px', background: '#738A6E', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Register again</Link>,
    },
  };

  if (status === 'idle') {
    return (
      <div>
        <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Verify your email
        </h2>
        <p style={{ color: '#738A6E', fontSize: '14px', marginBottom: '28px' }}>
          Enter the verification token sent to your email.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); handleVerify(tokenInput); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#344C3D', marginBottom: '6px' }}>Verification Token</label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter your token"
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E4E7E2', background: '#fff', fontSize: '14px', color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#738A6E', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            Verify email
          </button>
        </form>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', paddingTop: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(115,138,110,0.2)', borderTopColor: '#738A6E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
        <p style={{ color: '#738A6E', fontSize: '14px' }}>Verifying...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const s = states[status];

  return (
    <div style={{ textAlign: 'center', paddingTop: '16px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        {s.icon}
      </div>
      <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '10px' }}>{s.title}</h2>
      <p style={{ color: '#738A6E', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>{s.message}</p>
      {s.action}
    </div>
  );
}
