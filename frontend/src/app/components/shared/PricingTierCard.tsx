import type { PricingTier } from '../../lib/types';
import { formatPrice } from '../../lib/utils';

const PERIOD_SHORT: Record<'HOUR' | 'DAY' | 'WEEK', string> = {
  HOUR: 'hr',
  DAY: 'day',
  WEEK: 'week',
};

const PERIOD_PLURAL: Record<'HOUR' | 'DAY' | 'WEEK', string> = {
  HOUR: 'hrs',
  DAY: 'days',
  WEEK: 'weeks',
};

function formatRateLabel(period: 'HOUR' | 'DAY' | 'WEEK', duration: number, price: number): string {
  const unit = duration === 1 ? PERIOD_SHORT[period] : PERIOD_PLURAL[period];
  if (duration === 1) {
    return `${formatPrice(price)} / ${unit}`;
  }
  return `${formatPrice(price)} for ${duration} ${unit}`;
}

interface PricingTierCardProps {
  pricing: PricingTier;
  selected?: boolean;
  onSelect?: (pricing: PricingTier) => void;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PricingTierCard({ pricing, selected, onSelect, showActions, onEdit, onDelete }: PricingTierCardProps) {
  const isSelectable = !!onSelect;

  // compute per-unit rate for display
  const perUnitRate = pricing.price / pricing.duration;
  const perUnitLabel = `${formatPrice(perUnitRate)} / ${PERIOD_SHORT[pricing.period]}`;

  return (
    <div
      onClick={() => onSelect?.(pricing)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        border: `1px solid ${selected ? '#738A6E' : '#E4E7E2'}`,
        borderRadius: '8px',
        background: selected ? 'rgba(115,138,110,0.06)' : '#FAFAF8',
        cursor: isSelectable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {isSelectable && (
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${selected ? '#738A6E' : '#BFCFBB'}`,
            background: selected ? '#738A6E' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
          </div>
        )}
        <div>
          {/* Primary: rate-based label */}
          <div style={{ fontWeight: 700, color: '#344C3D', fontSize: '15px', letterSpacing: '-0.01em' }}>
            {formatRateLabel(pricing.period, pricing.duration, pricing.price)}
          </div>
          {/* Secondary: per-unit rate when duration > 1 */}
          {pricing.duration > 1 && (
            <div style={{ fontSize: '11px', color: '#8EA58C', marginTop: '1px' }}>
              {perUnitLabel} avg
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#8EA58C', marginTop: '2px' }}>
            + {formatPrice(pricing.deposit)} deposit
          </div>
        </div>
      </div>

      {/* Duration badge */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 8px',
          borderRadius: '5px', background: selected ? 'rgba(115,138,110,0.15)' : '#F0F3EF',
          color: selected ? '#344C3D' : '#8EA58C',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {pricing.duration === 1 ? PERIOD_SHORT[pricing.period] : `${pricing.duration} ${PERIOD_PLURAL[pricing.period]}`}
        </span>
      </div>

      {showActions && (
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            style={{ fontSize: '12px', color: '#738A6E', background: 'none', border: '1px solid #E4E7E2', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            style={{ fontSize: '12px', color: '#C97B3D', background: 'none', border: '1px solid #E4E7E2', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
