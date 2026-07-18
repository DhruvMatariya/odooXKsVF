import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { ShoppingBag, Package, User, LogOut } from 'lucide-react';

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Top navbar */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(115,138,110,0.15)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: '56px', gap: '24px' }}>
          {/* Logo */}
          <NavLink to="/customer/products" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginRight: '16px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#FAFAF8', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.03em', lineHeight: 1 }}>R</span>
            </div>
            <span style={{ color: '#344C3D', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.01em' }}>Rentsure</span>
          </NavLink>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
            <NavItem to="/customer/products" icon={<ShoppingBag size={15} />} label="Browse" />
            <NavItem to="/customer/orders" icon={<Package size={15} />} label="My Orders" />
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NavLink to="/customer/profile" style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '6px',
              background: isActive ? 'rgba(115,138,110,0.1)' : 'transparent',
              color: '#344C3D', textDecoration: 'none', fontSize: '13px', fontWeight: 600
            })}>
              <User size={14} />
              <span>{user?.fullName?.split(' ')[0]}</span>
            </NavLink>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px', borderRadius: '6px',
                background: 'transparent', border: 'none',
                color: '#C97B3D', cursor: 'pointer', fontSize: '13px', fontWeight: 600
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '6px',
        background: isActive ? 'rgba(115,138,110,0.1)' : 'transparent',
        color: isActive ? '#344C3D' : '#738A6E',
        textDecoration: 'none', fontSize: '13px', fontWeight: 600,
        transition: 'all 0.15s',
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
}
