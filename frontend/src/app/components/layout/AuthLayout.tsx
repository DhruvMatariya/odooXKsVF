import { Outlet } from 'react-router';

export function AuthLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#FAFAF8' }}>
      {/* Left branding panel */}
      <div style={{
        width: '420px', flexShrink: 0, background: '#344C3D',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 40px',
      }} className="hidden lg:flex">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: '#738A6E', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.03em', lineHeight: 1 }}>R</span>
            </div>
            <span style={{ color: '#FAFAF8', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>Rentsure</span>
          </div>

          <div style={{ marginTop: '40px' }}>
            <h1 style={{ color: '#FAFAF8', fontWeight: 700, fontSize: '28px', lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: '16px' }}>
              Rent anything.<br />Manage everything.
            </h1>
            <p style={{ color: '#8EA58C', fontSize: '15px', lineHeight: 1.6 }}>
              A complete rental management platform for vendors and customers from listing to inspection.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {['Vendor dashboard with live updates', 'Multi-tier pricing per product', 'Damage inspection & deposit management'].map((feat) => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#738A6E', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#BFCFBB' }}>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Mobile logo */}
          <div style={{ marginLeft:'190px',display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }} className="lg:hidden">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#738A6E', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em', lineHeight: 1 }}>R</span>
            </div>
            {/* <span style={{ fontWeight: 700, fontSize: '18px', color: '#344C3D' }}>Rentsure</span> */}
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
