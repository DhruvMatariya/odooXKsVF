import { Link, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type VerificationState = 'verified' | 'invalid' | 'expired';

export function EmailVerification() {
  const [params] = useSearchParams();
  const status = (params.get('status') as VerificationState) ?? 'verified';

  const states = {
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

  const s = states[status];

  return (
    <div style={{ textAlign: 'center', paddingTop: '16px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        {s.icon}
      </div>
      <h2 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', marginBottom: '10px' }}>{s.title}</h2>
      <p style={{ color: '#738A6E', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>{s.message}</p>
      {s.action}

      <div style={{ marginTop: '32px', padding: '12px', background: '#F0F3EF', borderRadius: '8px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', color: '#8EA58C' }}>Preview states:</span>
        {(['verified', 'invalid', 'expired'] as VerificationState[]).map(st => (
          <Link key={st} to={`/verify-email?status=${st}`} style={{ fontSize: '11px', color: '#738A6E', fontWeight: 500 }}>{st}</Link>
        ))}
      </div>
    </div>
  );
}
