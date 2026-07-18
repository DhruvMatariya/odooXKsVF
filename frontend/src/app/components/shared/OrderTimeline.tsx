import type { OrderEvent, OrderStatus } from '../../lib/types';
import { formatDateTime } from '../../lib/utils';

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Order Confirmed',
  DISPATCHED: 'Dispatched',
  HANDED_OVER: 'Handed Over',
  ACTIVE_RENTAL: 'Active Rental',
  RETURN_SCHEDULED: 'Return Scheduled',
  RETURNED_PENDING_INSPECTION: 'Returned — Pending Inspection',
  COMPLETED: 'Completed',
  DEPOSIT_REFUNDED: 'Deposit Refunded',
  DISPUTED: 'Disputed',
  PENALTY_APPLIED: 'Penalty Applied',
  REJECTED_AT_DELIVERY: 'Rejected at Delivery',
  CANCELLED: 'Cancelled',
  REPLACEMENT_REQUESTED: 'Replacement Requested',
};

const ACTOR_LABEL: Record<string, string> = {
  CUSTOMER: 'Customer',
  VENDOR: 'Vendor',
  SYSTEM: 'System',
};

interface OrderTimelineProps {
  events: OrderEvent[];
  currentStatus: OrderStatus;
}

export function OrderTimeline({ events, currentStatus }: OrderTimelineProps) {
  return (
    <div style={{ position: 'relative' }}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const isCurrent = event.toStatus === currentStatus && isLast;
        const isPast = !isCurrent;

        let dotColor = '#BFCFBB';
        let dotBorder = '#8EA58C';
        if (isCurrent) { dotColor = '#738A6E'; dotBorder = '#738A6E'; }
        else if (isPast) { dotColor = '#8EA58C'; dotBorder = '#8EA58C'; }

        return (
          <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '20px' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: dotColor, border: `2px solid ${dotBorder}`,
                flexShrink: 0, marginTop: '3px',
                ...(isCurrent ? { boxShadow: '0 0 0 3px rgba(115,138,110,0.2)' } : {}),
              }} />
              {!isLast && (
                <div style={{ width: '2px', flex: 1, background: '#E4E7E2', margin: '4px 0' }} />
              )}
            </div>

            <div style={{ paddingBottom: isLast ? '0' : '20px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontWeight: isCurrent ? 600 : 500,
                  color: isCurrent ? '#344C3D' : '#1A1A1A',
                  fontSize: '14px',
                }}>
                  {STATUS_LABELS[event.toStatus] ?? event.toStatus}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 500, padding: '1px 6px',
                  borderRadius: '4px', background: '#F0F3EF', color: '#738A6E',
                }}>
                  {ACTOR_LABEL[event.actorRole]}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#738A6E', marginTop: '2px' }}>
                {formatDateTime(event.timestamp)}
              </div>
              {event.note && (
                <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '4px', fontStyle: 'italic' }}>
                  {event.note}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
