import { Outlet, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/* Floating bubble data — varied sizes, positions, delays, durations */
const BUBBLES = [
  { size: 260, left: '5%',  top: '10%', delay: 0,    duration: 18 },
  { size: 180, left: '80%', top: '5%',  delay: 3,    duration: 22 },
  { size: 120, left: '55%', top: '60%', delay: 6,    duration: 16 },
  { size: 320, left: '70%', top: '70%', delay: 1,    duration: 25 },
  { size: 90,  left: '20%', top: '75%', delay: 8,    duration: 14 },
  { size: 200, left: '40%', top: '-5%', delay: 4,    duration: 20 },
  { size: 150, left: '90%', top: '40%', delay: 2,    duration: 19 },
  { size: 70,  left: '10%', top: '45%', delay: 10,   duration: 13 },
  { size: 240, left: '30%', top: '85%', delay: 5,    duration: 23 },
  { size: 110, left: '60%', top: '30%', delay: 7,    duration: 17 },
];

export function AuthLayout() {
  return (
    <>
      {/* Injected keyframe animation */}
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0px) scale(1); opacity: 0.07; }
          33%  { transform: translateY(-30px) scale(1.04); opacity: 0.12; }
          66%  { transform: translateY(15px) scale(0.97); opacity: 0.06; }
          100% { transform: translateY(0px) scale(1); opacity: 0.07; }
        }
        .auth-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(115,138,110,0.15);
          border-radius: 20px;
          box-shadow: 0 8px 40px rgba(52,76,61,0.08), 0 1px 3px rgba(52,76,61,0.06);
          padding: 40px 36px;
          width: 100%;
          max-width: 460px;
          max-height: calc(100vh - 48px);
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
        /* Hide scrollbar for cleaner look but keep functionality */
        .auth-card::-webkit-scrollbar {
          display: none;
        }
        .auth-card {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4f0 0%, #FAFAF8 50%, #eef2ee 100%)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Floating faded bubbles */}
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.left,
              top: b.top,
              width: `${b.size}px`,
              height: `${b.size}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 40%, #738A6E, #344C3D)',
              opacity: 0.07,
              animation: `floatBubble ${b.duration}s ${b.delay}s ease-in-out infinite`,
              pointerEvents: 'none',
              willChange: 'transform, opacity',
            }}
          />
        ))}

        {/* Centered glass card wrapping all auth screens */}
        <div className="auth-card">
          <Link to="/" aria-label="Back to home" style={{ position: 'absolute', top: '24px', left: '24px', color: '#8EA58C', transition: 'color 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#344C3D'; }} onMouseLeave={e => { e.currentTarget.style.color = '#8EA58C'; }}>
            <ArrowLeft size={20} />
          </Link>
          {/* Rentsure logo mark at top of every auth screen */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '9px', marginBottom: '28px',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ color: '#BFCFBB', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.03em' }}>R</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#344C3D', letterSpacing: '-0.02em' }}>Rentsure</span>
          </div>

          <Outlet />
        </div>
      </div>
    </>
  );
}
