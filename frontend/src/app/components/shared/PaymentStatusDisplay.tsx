import { Loader2, CreditCard, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface PaymentResult {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}

interface PaymentStatusDisplayProps {
  state: {
    status: string;
    error: string | null;
    rentalPayment: PaymentResult | null;
    depositPayment: PaymentResult | null;
  };
  onRetry: () => void;
  onRetryDeposit: () => void;
}

export function PaymentStatusDisplay({ state, onRetry, onRetryDeposit }: PaymentStatusDisplayProps) {
  const { status, error, rentalPayment, depositPayment } = state;

  const getStatusIcon = () => {
    switch (status) {
      case 'creating': return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#738A6E' }} />;
      case 'paying_rental': return <CreditCard size={16} style={{ color: '#738A6E' }} />;
      case 'verifying_rental': return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#738A6E' }} />;
      case 'paying_deposit': return <CreditCard size={16} style={{ color: '#738A6E' }} />;
      case 'verifying_deposit': return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#738A6E' }} />;
      case 'success': return <CheckCircle size={16} style={{ color: '#22C55E' }} />;
      case 'partial_failure': return <AlertCircle size={16} style={{ color: '#F59E0B' }} />;
      case 'error': return <XCircle size={16} style={{ color: '#EF4444' }} />;
      default: return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'creating': return 'Creating order…';
      case 'paying_rental': return 'Opening rental payment…';
      case 'verifying_rental': return 'Verifying rental payment…';
      case 'paying_deposit': return 'Opening deposit payment…';
      case 'verifying_deposit': return 'Verifying deposit payment…';
      case 'success': return 'Order confirmed!';
      case 'partial_failure': return 'Partial payment — action needed';
      case 'error': return 'Payment failed';
      default: return 'Ready';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {getStatusIcon()}
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#344C3D' }}>{getStatusText()}</span>
      </div>

      {rentalPayment && (
        <div style={{ fontSize: '12px', color: '#738A6E', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          Rental fee paid (ID: {rentalPayment.razorpayPaymentId.slice(0, 12)}…)
        </div>
      )}

      {depositPayment && (
        <div style={{ fontSize: '12px', color: '#738A6E', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          Deposit paid (ID: {depositPayment.razorpayPaymentId.slice(0, 12)}…)
        </div>
      )}

      {error && (
        <div style={{ fontSize: '12px', color: '#EF4444', padding: '8px', background: '#FEF2F2', borderRadius: '6px', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}

      {status === 'error' && (
        <button onClick={onRetry} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #738A6E', background: '#fff', color: '#738A6E', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          Retry Payment
        </button>
      )}

      {status === 'partial_failure' && rentalPayment && !depositPayment && (
        <button onClick={onRetryDeposit} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: '#738A6E', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          Complete Deposit Payment
        </button>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}