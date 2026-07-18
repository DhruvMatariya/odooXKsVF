import { DASHBOARD_STATS, VENDOR_ORDER_EVENTS } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { TrendingUp, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft, DollarSign, Shield, Zap } from 'lucide-react';

export function Dashboard() {
  const s = DASHBOARD_STATS;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '22px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>Today's overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(115,138,110,0.12)', padding: '6px 12px', borderRadius: '999px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#738A6E', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D' }}>Live</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          label="Active Rentals"
          value={s.activeRentals}
          icon={<TrendingUp size={16} />}
          color="#738A6E"
          bg="rgba(115,138,110,0.08)"
        />
        <StatCard
          label="Due Today"
          value={s.dueToday}
          icon={<Clock size={16} />}
          color="#738A6E"
          bg="rgba(115,138,110,0.08)"
        />
        <StatCard
          label="Overdue"
          value={s.overdue}
          icon={<AlertTriangle size={16} />}
          color="#C97B3D"
          bg="rgba(201,123,61,0.1)"
          highlight
        />
        <StatCard
          label="Upcoming Pickups"
          value={s.upcomingPickups}
          icon={<ArrowUpRight size={16} />}
          color="#738A6E"
          bg="rgba(115,138,110,0.08)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <RevenueCard value={s.revenue} />
        <StatCard
          label="Deposits Held"
          value={formatPrice(s.depositsHeld)}
          isString
          icon={<Shield size={16} />}
          color="#344C3D"
          bg="rgba(52,76,61,0.08)"
        />
        <StatCard
          label="Late Fees Collected"
          value={formatPrice(s.lateFeesCollected)}
          isString
          icon={<Zap size={16} />}
          color="#C97B3D"
          bg="rgba(201,123,61,0.08)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <StatCard label="Upcoming Returns" value={s.upcomingReturns} icon={<ArrowDownLeft size={16} />} color="#738A6E" bg="rgba(115,138,110,0.08)" />
        <div /> {/* placeholder for future stat */}
      </div>

      {/* Activity feed */}
      <div style={{ marginTop: '32px', background: '#fff', border: '1px solid #E4E7E2', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E4E7E2', background: '#F0F3EF', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#738A6E' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Activity</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {VENDOR_ORDER_EVENTS.map((event, idx) => {
            const isLast = idx === VENDOR_ORDER_EVENTS.length - 1;
            return (
              <div key={idx} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#BFCFBB', border: '2px solid #8EA58C', flexShrink: 0, marginTop: '4px' }} />
                  {!isLast && <div style={{ width: '2px', flex: 1, background: '#E4E7E2', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: isLast ? '0' : '20px', flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#344C3D', fontWeight: 500 }}>
                    {event.fromStatus && <span style={{ color: '#8EA58C' }}>{event.fromStatus} → </span>}
                    <strong>{event.toStatus}</strong>
                    <span style={{ fontSize: '11px', fontWeight: 500, padding: '1px 6px', borderRadius: '4px', background: '#F0F3EF', color: '#738A6E', marginLeft: '6px' }}>
                      {event.actorRole}
                    </span>
                  </div>
                  {event.note && <div style={{ fontSize: '12px', color: '#8EA58C', marginTop: '2px' }}>{event.note}</div>}
                  <div style={{ fontSize: '11px', color: '#BFCFBB', marginTop: '3px' }}>{formatDateTime(event.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, isString, icon, color, bg, highlight }: {
  label: string; value: number | string; isString?: boolean; icon: React.ReactNode;
  color: string; bg: string; highlight?: boolean;
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${highlight ? 'rgba(201,123,61,0.25)' : '#E4E7E2'}`, borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: isString ? '20px' : '28px', color: highlight ? '#C97B3D' : '#344C3D', letterSpacing: isString ? '-0.01em' : '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function RevenueCard({ value }: { value: number }) {
  return (
    <div style={{ background: '#344C3D', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Revenue</span>
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(115,138,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={16} color="#8EA58C" />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '32px', color: '#FAFAF8', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          {formatPrice(value)}
        </div>
        <div style={{ fontSize: '12px', color: '#738A6E' }}>All time earnings</div>
      </div>
    </div>
  );
}
