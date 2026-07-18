import { useState, useEffect } from 'react';
import { formatPrice } from '../../lib/utils';
import { TrendingUp, Clock, AlertTriangle, ArrowUpRight, DollarSign, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { getVendorDashboardStats } from '../../lib/api';

const COLORS = ['#344C3D', '#738A6E', '#C97B3D', '#8EA58C', '#BFCFBB'];

const FALLBACK_REVENUE_DATA = [
  { name: 'Mon', revenue: 0 },
  { name: 'Tue', revenue: 0 },
  { name: 'Wed', revenue: 0 },
  { name: 'Thu', revenue: 0 },
  { name: 'Fri', revenue: 0 },
  { name: 'Sat', revenue: 0 },
  { name: 'Sun', revenue: 0 },
];

const FALLBACK_STATUS_DATA = [
  { name: 'Pending', count: 0 },
  { name: 'Active', count: 0 },
  { name: 'Disputed', count: 0 },
  { name: 'Completed', count: 0 },
  { name: 'Cancelled', count: 0 },
];

export function Dashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    activeRentals: 0,
    dueToday: 0,
    overdue: 0,
    upcomingPickups: 0,
    newRequests: 0,
    revenueChart: FALLBACK_REVENUE_DATA,
    statusDistribution: FALLBACK_STATUS_DATA,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await getVendorDashboardStats();
      if (res.data) {
        setStats({
          revenue: res.data.revenue || 0,
          activeRentals: res.data.activeRentals || 0,
          dueToday: res.data.dueToday || 0,
          overdue: res.data.overdue || 0,
          upcomingPickups: res.data.upcomingPickups || 0,
          newRequests: res.data.newRequests || 0,
          revenueChart: (res.data.revenueChart?.length ? res.data.revenueChart : FALLBACK_REVENUE_DATA),
          statusDistribution: (res.data.statusDistribution?.length ? res.data.statusDistribution : FALLBACK_STATUS_DATA),
        });
      }
    } catch (e) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#8EA58C' }}>
        <div>Loading dashboard…</div>
      </div>
    );
  }

  const s = stats;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ color: '#344C3D', fontWeight: 700, fontSize: '24px', letterSpacing: '-0.02em', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ color: '#738A6E', fontSize: '14px' }}>Today's overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(115,138,110,0.12)', padding: '6px 12px', borderRadius: '100px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#738A6E', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#344C3D' }}>Live Overview</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <RevenueCard value={s.revenue} />
        <StatCard label="Active Rentals" value={s.activeRentals} icon={<TrendingUp size={16} />} color="#738A6E" bg="rgba(115,138,110,0.1)" />
        <StatCard label="Due Today" value={s.dueToday} icon={<Clock size={16} />} color="#738A6E" bg="rgba(115,138,110,0.1)" />
        <StatCard label="Overdue" value={s.overdue} icon={<AlertTriangle size={16} />} color="#C97B3D" bg="rgba(201,123,61,0.15)" highlight />
      </div>

      {/* Secondary Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Upcoming Pickups" value={s.upcomingPickups} icon={<ArrowUpRight size={16} />} color="#344C3D" bg="rgba(52,76,61,0.1)" />
        <StatCard label="New Requests" value={s.newRequests} icon={<ArrowUpRight size={16} />} color="#344C3D" bg="rgba(52,76,61,0.1)" />
        <div />
        <div />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#344C3D' }}>Performance Overview</h2>
        <Link to="/vendor/analytics" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#738A6E', textDecoration: 'none', background: 'rgba(115,138,110,0.1)', padding: '8px 16px', borderRadius: '100px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(115,138,110,0.2)'; e.currentTarget.style.color = '#344C3D'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(115,138,110,0.1)'; e.currentTarget.style.color = '#738A6E'; }}>
          View Detailed Analytics <ArrowRight size={14} />
        </Link>
      </div>

      {/* Analytics Charts (Area & Pie) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Revenue Area Chart */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#344C3D', marginBottom: '24px' }}>Revenue (7 Days)</h3>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.revenueChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#738A6E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#738A6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(115,138,110,0.1)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8EA58C' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8EA58C' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(115,138,110,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#344C3D', fontWeight: 600 }}
                  formatter={(value: number) => [`₹${value}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#738A6E" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Distribution Pie Chart */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: '1px solid rgba(115,138,110,0.15)', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#344C3D', marginBottom: '24px' }}>Order Distribution</h3>
          <div style={{ flex: 1, minHeight: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={s.statusDistribution}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  animationDuration={1500}
                >
                  {s.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid rgba(115,138,110,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: '#344C3D', fontWeight: 600 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#344C3D', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg, highlight }: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; bg: string; highlight?: boolean;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', border: `1px solid ${highlight ? 'rgba(201,123,61,0.25)' : 'rgba(115,138,110,0.15)'}`, borderRadius: '20px', padding: '20px', boxShadow: '0 8px 32px rgba(52,76,61,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#8EA58C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ fontWeight: 800, fontSize: '32px', color: highlight ? '#C97B3D' : '#344C3D', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function RevenueCard({ value }: { value: number }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #344C3D 0%, #25382A 100%)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 12px 32px rgba(52,76,61,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#BFCFBB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Revenue</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={16} color="#FAFAF8" />
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