import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, ChevronDown, Calendar, FileText, Sliders, User } from 'lucide-react';
import { useState } from 'react';

export function VendorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAFAF8' }}>
      {/* Glass Sidebar */}
      <aside style={{
        width: '224px', flexShrink: 0, 
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0,
        borderRight: '1px solid rgba(115,138,110,0.15)',
        boxShadow: '4px 0 24px rgba(52,76,61,0.03)',
        zIndex: 50
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(115,138,110,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FAFAF8', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.03em', lineHeight: 1 }}>R</span>
            </div>
            <span style={{ color: '#344C3D', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.01em' }}>Rentsure</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#738A6E', fontWeight: 600 }}>Vendor Portal</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
          <SideNavItem to="/vendor/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" />

          <div style={{ marginTop: '8px', marginBottom: '4px', padding: '0 10px', fontSize: '10px', color: '#8EA58C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Catalog</div>
          <SideNavItem to="/vendor/products" icon={<Package size={15} />} label="Products" />

          <div style={{ marginTop: '8px', marginBottom: '4px', padding: '0 10px', fontSize: '10px', color: '#8EA58C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Operations</div>
          <SideNavItem to="/vendor/orders" icon={<ShoppingBag size={15} />} label="Orders" />

          <div style={{ marginTop: '8px', marginBottom: '4px', padding: '0 10px', fontSize: '10px', color: '#8EA58C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Settings</div>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '8px', padding: '7px 10px', borderRadius: '6px',
              background: 'transparent', border: 'none', color: '#344C3D',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={15} /> Settings
            </span>
            <ChevronDown size={12} style={{ transform: settingsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#8EA58C' }} />
          </button>
          {settingsOpen && (
            <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <SideNavItem to="/vendor/settings/return-slots" icon={<Calendar size={14} />} label="Return Slots" small />
              <SideNavItem to="/vendor/settings/late-fee" icon={<FileText size={14} />} label="Late Fee Rules" small />
              <SideNavItem to="/vendor/settings/cancellation" icon={<Sliders size={14} />} label="Cancellation Policy" small />
            </div>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(115,138,110,0.15)' }}>
          <NavLink to="/vendor/profile" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 10px', borderRadius: '6px', textDecoration: 'none',
            background: isActive ? 'rgba(115,138,110,0.1)' : 'transparent',
          })}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="#FAFAF8" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#344C3D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</div>
              <div style={{ fontSize: '10px', color: '#738A6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.companyName ?? 'Vendor'}</div>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
              padding: '6px 10px', borderRadius: '6px', background: 'transparent',
              border: 'none', color: '#C97B3D', cursor: 'pointer', fontSize: '12px', marginTop: '4px', fontWeight: 600
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: '224px', flex: 1, minHeight: '100vh' }}>
        <main style={{ padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideNavItem({ to, icon, label, small }: { to: string; icon: React.ReactNode; label: string; small?: boolean }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: small ? '5px 10px' : '7px 10px', borderRadius: '6px',
        background: isActive ? 'rgba(115,138,110,0.1)' : 'transparent',
        color: isActive ? '#344C3D' : '#738A6E',
        textDecoration: 'none', fontSize: small ? '12px' : '13px', fontWeight: 600,
        transition: 'all 0.15s',
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
}
