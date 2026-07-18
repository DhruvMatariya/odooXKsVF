import { DASHBOARD_STATS, VENDOR_ORDER_EVENTS } from '../../lib/mockData';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { Shield, Zap, DollarSign, Activity, TrendingUp, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft, ArrowLeft } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Link } from 'react-router';

const REVENUE_DATA = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 6890 },
  { name: 'Sat', revenue: 8390 },
  { name: 'Sun', revenue: 9490 },
];

const ORDER_STATUS_DATA = [
  { name: 'Pending', count: 12 },
  { name: 'Active', count: 19 },
  { name: 'Disputed', count: 2 },
  { name: 'Completed', count: 45 },
  { name: 'Cancelled', count: 5 },
];

const COLORS = ['#344C3D', '#738A6E', '#C97B3D', '#8EA58C', '#BFCFBB'];

export function Analytics() {
  const s = DASHBOARD_STATS;

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <Link to="/vendor/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#8EA58C', textDecoration: 'none', marginBottom: '16px', transition: 'color 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#344C3D'; }} onMouseLeave={e => { e.currentTarget.style.color = '#8EA58C'; }}>
          <ArrowLeft size={16} /> Back to Overview
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Detailed Analytics</h1>
            <p style={{ color: '#738A6E', fontSize: '14px' }}>In-depth view of your business performance</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <RevenueCard value={s.revenue} />
        <StatCard label="Active Rentals" value={s.activeRentals} icon={<TrendingUp size={16} />} color="#738A6E" bg="rgba(115,138,110,0.08)" />
        <StatCard label="Due Today" value={s.dueToday} icon={<Clock size={16} />} color="#738A6E" bg="rgba(115,138,110,0.08)" />
        <StatCard label="Overdue" value={s.overdue} icon={<AlertTriangle size={16} />} color="#C97B3D" bg="rgba(201,123,61,0.1)" />
        <StatCard label="Upcoming Pickups" value={s.upcomingPickups} icon={<ArrowUpRight size={16} />} color="#344C3D" bg="rgba(52,76,61,0.08)" />
        <StatCard label="Upcoming Returns" value={s.upcomingReturns} icon={<ArrowDownLeft size={16} />} color="#738A6E" bg="rgba(115,138,110,0.08)" />
        <StatCard label="Deposits Held" value={formatPrice(s.depositsHeld)} isString icon={<Shield size={16} />} color="#344C3D" bg="rgba(52,76,61,0.08)" />
        <StatCard label="Late Fees" value={formatPrice(s.lateFeesCollected)} isString icon={<Zap size={16} />} color="#C97B3D" bg="rgba(201,123,61,0.08)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Full Revenue Chart */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#344C3D', marginBottom: '24px' }}>Revenue Trends (7 Days)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueLong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#738A6E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#738A6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(115,138,110,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8EA58C' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8EA58C' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(115,138,110,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#344C3D', fontWeight: 700 }}
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#738A6E" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueLong)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Breakdown */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#344C3D', marginBottom: '24px' }}>Order Breakdown</h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ORDER_STATUS_DATA}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  animationDuration={1500}
                >
                  {ORDER_STATUS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(115,138,110,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#344C3D', fontWeight: 700 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Full Activity Feed */}
      <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(115,138,110,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(115,138,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color="#738A6E" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#344C3D' }}>Comprehensive Activity Log</h3>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {VENDOR_ORDER_EVENTS.map((event, idx) => {
            const isLast = idx === VENDOR_ORDER_EVENTS.length - 1;
            return (
              <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#BFCFBB', border: '3px solid #8EA58C', flexShrink: 0, marginTop: '4px' }} />
                  {!isLast && <div style={{ width: '2px', flex: 1, background: 'rgba(115,138,110,0.2)', margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: isLast ? '0' : '24px', flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#344C3D', fontWeight: 600 }}>
                    {event.fromStatus && <span style={{ color: '#8EA58C' }}>{event.fromStatus} → </span>}
                    {event.toStatus}
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#738A6E', marginLeft: '6px' }}>
                      ({event.actorRole})
                    </span>
                  </div>
                  {event.note && <div style={{ fontSize: '13px', color: '#738A6E', marginTop: '6px', background: 'rgba(255,255,255,0.5)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(115,138,110,0.1)' }}>{event.note}</div>}
                  <div style={{ fontSize: '12px', color: '#BFCFBB', marginTop: '6px', fontWeight: 500 }}>{formatDateTime(event.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, isString, icon, color, bg }: {
  label: string; value: number | string; isString?: boolean; icon: React.ReactNode;
  color: string; bg: string;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ fontWeight: 800, fontSize: isString ? '24px' : '32px', color: '#344C3D', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function RevenueCard({ value }: { value: number }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #344C3D 0%, #25382A 100%)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 12px 32px rgba(52,76,61,0.2)', gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#BFCFBB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Revenue</span>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={18} color="#FAFAF8" />
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '36px', color: '#FAFAF8', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          {formatPrice(value)}
        </div>
        <div style={{ fontSize: '13px', color: '#8EA58C', fontWeight: 500 }}>All time earnings</div>
      </div>
    </div>
  );
}
