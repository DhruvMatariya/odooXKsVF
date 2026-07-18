import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { ShoppingBag, Package, User, LogOut } from 'lucide-react';
import { useState } from 'react';

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', position: 'relative' }}>

      {/* Ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-4%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(115,138,110,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(52,76,61,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      {/* Landing-page style floating navbar */}
      <nav style={{
        position: 'sticky', top: '14px', zIndex: 50,
        margin: '0 auto', maxWidth: '1200px', width: 'calc(100% - 48px)',
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(115,138,110,0.18)',
        borderRadius: '100px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(52,76,61,0.07)',
      }}>
        {/* Logo */}
        <NavLink to="/customer/products" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FAFAF8', fontWeight: 800, fontSize: '15px' }}>R</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: '20px', color: '#344C3D', letterSpacing: '-0.02em' }}>Rentsure</span>
        </NavLink>

        {/* Nav links — center */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <NavItem to="/customer/products" icon={<ShoppingBag size={15} />} label="Browse" />
          <NavItem to="/customer/orders" icon={<Package size={15} />} label="My Orders" />
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavLink to="/customer/profile" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '100px',
            background: isActive ? 'rgba(115,138,110,0.12)' : 'transparent',
            color: isActive ? '#344C3D' : '#738A6E',
            textDecoration: 'none', fontSize: '14px', fontWeight: 600,
            transition: 'all 0.2s',
          })}>
            <User size={15} />
            <span>{user?.fullName?.split(' ')[0]}</span>
          </NavLink>
          <button
            onClick={() => setShowSignoutConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '100px',
              background: 'transparent', border: 'none',
              color: '#C97B3D', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,123,61,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>

      {/* Signout Confirmation Modal */}
      {showSignoutConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '320px', boxShadow: '0 24px 64px rgba(52,76,61,0.12)', textAlign: 'center', border: '1px solid rgba(115,138,110,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(201,123,61,0.1)', color: '#C97B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <LogOut size={24} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#344C3D', letterSpacing: '-0.02em', marginBottom: '8px' }}>Sign out?</h3>
            <p style={{ fontSize: '14px', color: '#738A6E', marginBottom: '32px', lineHeight: 1.5 }}>Are you sure you want to log out of your account?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSignoutConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E4E7E2', background: '#fff', color: '#344C3D', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#F0F3EF'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>Cancel</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#C97B3D', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(201,123,61,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '7px 14px', borderRadius: '100px',
        background: isActive ? 'rgba(115,138,110,0.1)' : 'transparent',
        color: isActive ? '#344C3D' : '#738A6E',
        textDecoration: 'none', fontSize: '14px', fontWeight: 500,
        transition: 'all 0.2s',
      })}
      onMouseEnter={e => { if (!(e.currentTarget as HTMLElement).classList.contains('active')) { (e.currentTarget as HTMLElement).style.background = 'rgba(115,138,110,0.07)'; (e.currentTarget as HTMLElement).style.color = '#344C3D'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = ''; }}
    >
      {icon}
      {label}
    </NavLink>
  );
}
