import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, ChevronDown, Calendar, FileText, Sliders, User, LineChart } from 'lucide-react';
import { useState } from 'react';

export function VendorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAFAF8', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Orbs (similar to landing page) */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(115,138,110,0.06) 0%, rgba(250,250,248,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(201,123,61,0.04) 0%, rgba(250,250,248,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', right: '15%', width: '25vw', height: '25vw', background: 'radial-gradient(circle, rgba(52,76,61,0.03) 0%, rgba(250,250,248,0) 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

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
          <SideNavItem to="/vendor/dashboard" icon={<LayoutDashboard size={15} />} label="Overview" />

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
              <div style={{ fontSize: '10px', color: '#738A6E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.vendorProfile?.company_name ?? 'Vendor'}</div>
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
      <div style={{ marginLeft: '224px', flex: 1, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <main style={{ padding: '32px' }}>
          <Outlet />
        </main>
      </div>

      {/* Signout Confirmation Modal */}
      {showSignoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '320px', boxShadow: '0 24px 64px rgba(52,76,61,0.12)', textAlign: 'center', border: '1px solid rgba(115,138,110,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(201,123,61,0.1)', color: '#C97B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#344C3D', letterSpacing: '-0.02em', marginBottom: '8px' }}>Sign out?</h3>
            <p style={{ fontSize: '14px', color: '#738A6E', marginBottom: '32px', lineHeight: 1.5 }}>Are you sure you want to log out of your account?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSignoutConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#F0F3EF'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#C97B3D', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(201,123,61,0.3)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(201,123,61,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(201,123,61,0.3)'; }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
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
