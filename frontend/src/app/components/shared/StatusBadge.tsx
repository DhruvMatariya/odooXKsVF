import type { OrderStatus } from '../../lib/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  CONFIRMED: { label: 'Confirmed', bg: 'rgba(142,165,140,0.15)', text: '#5a7a58' },
  DISPATCHED: { label: 'Dispatched', bg: 'rgba(142,165,140,0.15)', text: '#5a7a58' },
  HANDED_OVER: { label: 'Handed Over', bg: 'rgba(115,138,110,0.15)', text: '#4a6848' },
  ACTIVE_RENTAL: { label: 'Active Rental', bg: 'rgba(115,138,110,0.15)', text: '#4a6848' },
  RETURN_SCHEDULED: { label: 'Return Scheduled', bg: 'rgba(115,138,110,0.15)', text: '#4a6848' },
  RETURNED_PENDING_INSPECTION: { label: 'Pending Inspection', bg: 'rgba(115,138,110,0.15)', text: '#4a6848' },
  COMPLETED: { label: 'Completed', bg: 'rgba(52,76,61,0.12)', text: '#344C3D' },
  DEPOSIT_REFUNDED: { label: 'Deposit Refunded', bg: 'rgba(52,76,61,0.12)', text: '#344C3D' },
  DISPUTED: { label: 'Disputed', bg: 'rgba(201,123,61,0.15)', text: '#C97B3D' },
  PENALTY_APPLIED: { label: 'Penalty Applied', bg: 'rgba(201,123,61,0.15)', text: '#C97B3D' },
  REJECTED_AT_DELIVERY: { label: 'Rejected at Delivery', bg: 'rgba(201,123,61,0.15)', text: '#C97B3D' },
  CANCELLED: { label: 'Cancelled', bg: 'rgba(0,0,0,0.06)', text: '#6b7280' },
  REPLACEMENT_REQUESTED: { label: 'Replacement Requested', bg: 'rgba(201,123,61,0.15)', text: '#C97B3D' },
};

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, bg: 'rgba(0,0,0,0.06)', text: '#6b7280' };
  const padding = size === 'sm' ? '2px 8px' : '3px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        fontSize,
        fontWeight: 500,
        borderRadius: '999px',
        background: config.bg,
        color: config.text,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {config.label}
    </span>
  );
}
