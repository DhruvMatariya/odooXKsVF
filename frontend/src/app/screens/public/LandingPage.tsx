import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight, ShieldCheck, Zap, BarChart3, PackageOpen,
  CheckCircle, Star, Mail, Phone, MapPin, Sun, Moon,
  TrendingUp, Clock, Users, Github, Twitter, Linkedin
} from 'lucide-react';

/* ─── Theme tokens ───────────────────────────────────────── */
const LIGHT = {
  bg: '#FAFAF8',
  surface: 'rgba(255,255,255,0.7)',
  surfaceSolid: '#ffffff',
  border: 'rgba(115,138,110,0.18)',
  text: '#344C3D',
  textSub: '#738A6E',
  textMuted: '#8EA58C',
  accent: '#738A6E',
  accentDark: '#344C3D',
  navBg: 'rgba(255,255,255,0.75)',
  footerBg: 'rgba(255,255,255,0.6)',
  ctaOverlay: 'rgba(20,35,25,0.45)',
  cardBg: 'rgba(255,255,255,0.5)',
  cardHover: 'rgba(255,255,255,0.85)',
};
const DARK = {
  bg: '#0E1A12',
  surface: 'rgba(26,40,30,0.8)',
  surfaceSolid: '#1A2820',
  border: 'rgba(115,138,110,0.22)',
  text: '#E8F0E6',
  textSub: '#8EA58C',
  textMuted: '#738A6E',
  accent: '#8EA58C',
  accentDark: '#BFCFBB',
  navBg: 'rgba(14,26,18,0.85)',
  footerBg: 'rgba(14,26,18,0.9)',
  ctaOverlay: 'rgba(8,18,10,0.60)',
  cardBg: 'rgba(26,40,30,0.7)',
  cardHover: 'rgba(40,60,44,0.9)',
};

export function LandingPage() {
  const [dark, setDark] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const t = dark ? DARK : LIGHT;

  useEffect(() => {
    const onScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const wh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollProgress(wh > 0 ? totalScroll / wh : 0);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, overflow: 'hidden',
      position: 'relative', display: 'flex', flexDirection: 'column',
      transition: 'background 0.4s ease, color 0.4s ease',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>

      {/* ── Ambient orbs ─────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-12%', left: '-5%', width: '640px', height: '640px', background: `radial-gradient(circle, ${dark ? 'rgba(115,138,110,0.08)' : 'rgba(115,138,110,0.13)'} 0%, transparent 70%)`, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-8%', width: '800px', height: '800px', background: `radial-gradient(circle, ${dark ? 'rgba(52,76,61,0.1)' : 'rgba(52,76,61,0.1)'} 0%, transparent 70%)`, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '40%', left: '60%', width: '400px', height: '400px', background: `radial-gradient(circle, ${dark ? 'rgba(115,138,110,0.05)' : 'rgba(115,138,110,0.07)'} 0%, transparent 70%)`, borderRadius: '50%' }} />
      </div>

      {/* ── NAVBAR ────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: '16px', zIndex: 50,
        margin: '0 auto', maxWidth: '1200px', width: 'calc(100% - 48px)',
        padding: '10px 20px',
        background: t.navBg,
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${t.border}`,
        borderRadius: '100px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(52,76,61,0.07)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#FAFAF8', fontWeight: 800, fontSize: '15px' }}>R</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: '20px', color: t.text, letterSpacing: '-0.02em' }}>Rentsure</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {['Features', 'About', 'Contact'].map(label => (
            <a key={label} href={`#${label.toLowerCase()}`} style={{ fontSize: '14px', fontWeight: 500, color: t.textSub, textDecoration: 'none', padding: '7px 14px', borderRadius: '100px', transition: 'all 0.2s' }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
              }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(115,138,110,0.15)' : 'rgba(115,138,110,0.1)'; e.currentTarget.style.color = t.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textSub; }}>
              {label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Theme toggle */}
          <button onClick={() => setDark(d => !d)} style={{
            width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${t.border}`,
            background: dark ? 'rgba(115,138,110,0.2)' : 'rgba(52,76,61,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.3s', color: t.textSub
          }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" style={{ fontSize: '14px', fontWeight: 600, color: t.textSub, textDecoration: 'none', padding: '8px 16px', borderRadius: '100px' }}>Sign in</Link>
          <Link to="/register" style={{
            fontSize: '14px', fontWeight: 600, color: '#fff', textDecoration: 'none',
            background: '#738A6E', padding: '9px 22px', borderRadius: '100px',
            boxShadow: '0 4px 12px rgba(115,138,110,0.35)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(115,138,110,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(115,138,110,0.35)'; }}>
            Get Started
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1, position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section style={{ paddingTop: '80px', paddingBottom: '60px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '68px', fontWeight: 800, color: t.text, letterSpacing: '-0.04em', lineHeight: 1.07, maxWidth: '820px',marginTop:'30px', margin: '0px auto 0px' }}>
            Rent anything.<br />
            <span style={{ color: t.accent }}><Typewriter text="Manage everything." /></span>
          </h1>
          <p style={{ fontSize: '18px', color: t.textMuted, maxWidth: '580px', margin: '16px auto 32px', lineHeight: 1.65 }}>
            The complete rental operating system. From high-end cameras to heavy machinery handle listings, deposits, and returns with absolute confidence.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '15px', fontWeight: 700, color: '#fff', textDecoration: 'none',
              background: '#344C3D', padding: '13px 30px', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(52,76,61,0.25)', transition: 'transform 0.2s'
            }}>
              Start for Free <ArrowRight size={16} />
            </Link>
          </div>
          {/* Stats strip */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '48px', paddingTop: '32px', borderTop: `1px solid ${t.border}` }}>
            {[
              { end: 10, suffix: 'k+', label: 'Rentals processed' },
              { end: 98, suffix: '%', label: 'Deposit accuracy' },
              { end: 500, suffix: '+', label: 'Active vendors' }
            ].map(({ end, suffix, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: t.text, letterSpacing: '-0.02em' }}>
                  <CountUp end={end} suffix={suffix} />
                </div>
                <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section id="features" style={{ padding: '80px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Platform</p>
            <h2 style={{ fontSize: '36px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: '14px' }}>Built for scale. Designed for trust.</h2>
            <p style={{ fontSize: '16px', color: t.textMuted, maxWidth: '500px', margin: '0 auto' }}>Everything you need to run a modern, end-to-end rental business.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            <FeatureCard icon={<ShieldCheck size={22} />} title="Automated Deposits" desc="Hold deposits securely via Stripe. Automatically deduct late fees or damages based on your custom rules." t={t} />
            <FeatureCard icon={<PackageOpen size={22} />} title="Live Inventory Sync" desc="Real-time syncing. When an item is booked, inventory instantly locks to prevent double-booking." t={t} />
            <FeatureCard icon={<BarChart3 size={22} />} title="Vendor Analytics" desc="Track revenue, monitor active rentals, and manage your equipment pipeline from a single dashboard." t={t} />
            <FeatureCard icon={<TrendingUp size={22} />} title="Order Lifecycle" desc="Full order lifecycle from PENDING_PAYMENT to COMPLETED with automated state transitions and audit logs." t={t} />
            <FeatureCard icon={<Clock size={22} />} title="Late Fee Engine" desc="Configure grace periods, hourly or daily rate types, and max caps. Penalties auto-calculate on inspection." t={t} />
            <FeatureCard icon={<Users size={22} />} title="Multi-Role Access" desc="Separate portals for customers and vendors. Role-based access ensures every user sees only what they need." t={t} />
          </div>
        </section>

        {/* ── ABOUT ─────────────────────────────────────────── */}
        <section id="about" style={{ padding: '100px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>About Us</p>
              <h2 style={{ fontSize: '36px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '20px' }}>
                The rental platform<br />built by operators.
              </h2>
              <p style={{ fontSize: '16px', color: t.textMuted, lineHeight: 1.7, marginBottom: '24px' }}>
                Rentsure was built to solve a real problem — managing rentals, deposits, and returns across dozens of products is chaotic without the right tools. We've built the infrastructure to make it simple, transparent, and scalable.
              </p>
              <p style={{ fontSize: '16px', color: t.textMuted, lineHeight: 1.7, marginBottom: '32px' }}>
                Our platform connects customers and vendors with an end-to-end order lifecycle, automated deposit handling via Stripe, and real-time inventory tracking — all built on a strict, auditable contract.
              </p>
              {['Full order audit trail via order events', 'Stripe-powered deposit hold & refund', 'BullMQ background jobs for reminders', 'Socket.IO for real-time dashboard updates'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <CheckCircle size={16} color={t.accent} />
                  <span style={{ fontSize: '14px', color: t.textMuted }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Visual card */}
            <div style={{
              background: t.cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${t.border}`, borderRadius: '28px', padding: '40px',
              boxShadow: dark ? '0 16px 40px rgba(0,0,0,0.3)' : '0 16px 40px rgba(52,76,61,0.06)'
            }}>
              {[
                { icon: <ShieldCheck size={18} />, label: 'Deposit Secured', sub: '₹12,500 held via Stripe', color: '#4CAF50' },
                { icon: <Clock size={18} />, label: 'Return Scheduled', sub: 'Slot: Afternoon · Dec 12', color: '#FF9800' },
                { icon: <Star size={18} />, label: 'Inspection Complete', sub: 'No damage · Full refund', color: '#738A6E' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px', borderRadius: '14px',
                  background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                  border: `1px solid ${t.border}`,
                  marginBottom: i < 2 ? '12px' : '0'
                }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────── */}
        <section style={{ padding: '80px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Testimonials</p>
          <h2 style={{ fontSize: '36px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: '48px' }}>What our vendors say</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { quote: 'Rentsure changed how we handle camera equipment rentals. The deposit automation alone saved us 10+ hours a week.', name: 'Priya Sharma', role: 'ProGear Rentals' },
              { quote: 'The order lifecycle is exactly what we needed. Every state change is logged — our team knows exactly what happened and when.', name: 'Arjun Mehta', role: 'ElectraStar Events' },
              { quote: "Late fee calculations used to be manual and error-prone. Now they're automatic and accurate. Incredible product.", name: 'Rahul Desai', role: 'ToolBox Ventures' },
            ].map(({ quote, name, role }) => (
              <div key={name} style={{
                background: t.cardBg, backdropFilter: 'blur(16px)',
                border: `1px solid ${t.border}`, borderRadius: '20px', padding: '28px',
                textAlign: 'left',
                boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 8px 24px rgba(52,76,61,0.04)'
              }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#738A6E" color="#738A6E" />)}
                </div>
                <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.7, marginBottom: '20px' }}>"{quote}"</p>
                <div style={{ fontWeight: 700, fontSize: '13px', color: t.text }}>{name}</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>{role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA — PARALLAX ────────────────────────────────── */}
        <section style={{
          margin: '40px 0 60px 0', padding: '100px 40px', textAlign: 'center',
          borderRadius: '32px', position: 'relative', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(52,76,61,0.18)'
        }}>
          <div style={{
            position: 'absolute', inset: '-40px', zIndex: 0,
            backgroundImage: 'url(/unnamed.jpg)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,28,18,0.58)', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(191,207,187,0.9)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Get Started Today</p>
            <h2 style={{ fontSize: '44px', fontWeight: 800, color: '#FAFAF8', letterSpacing: '-0.03em', marginBottom: '16px', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>Ready to transform your rentals?</h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', maxWidth: '480px', margin: '0 auto 40px', lineHeight: 1.65 }}>Join top vendors managing their entire catalog on Rentsure today.</p>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '16px', fontWeight: 700, color: '#344C3D', textDecoration: 'none',
              background: '#fff', padding: '14px 36px', borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.22)', transition: 'transform 0.2s'
            }}>
              Create Free Account
            </Link>
          </div>
        </section>

        {/* ── CONTACT ───────────────────────────────────────── */}
        <section id="contact" style={{ padding: '80px 0 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Contact</p>
            <h2 style={{ fontSize: '36px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: '14px' }}>Get in touch</h2>
            <p style={{ fontSize: '16px', color: t.textMuted }}>Have a question or want to partner with us? We'd love to hear from you.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
            {/* Contact info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {[
                { icon: <Mail size={18} />, label: 'Email', value: 'hello@rentsure.app' },
                { icon: <Phone size={18} />, label: 'Phone', value: '+91 93271 24049' },
                { icon: <MapPin size={18} />, label: 'Location', value: 'Ahmedabad, Gujarat, India' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: dark ? 'rgba(115,138,110,0.15)' : 'rgba(115,138,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: t.textMuted, marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: t.text }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Contact form */}
            <div style={{
              background: t.cardBg, backdropFilter: 'blur(16px)',
              border: `1px solid ${t.border}`, borderRadius: '20px', padding: '32px',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <input placeholder="Your name" style={{ padding: '11px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#fff', color: t.text, fontSize: '14px', outline: 'none' }} />
              <input placeholder="your@email.com" type="email" style={{ padding: '11px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#fff', color: t.text, fontSize: '14px', outline: 'none' }} />
              <textarea placeholder="Your message..." rows={4} style={{ padding: '11px 14px', borderRadius: '10px', border: `1px solid ${t.border}`, background: dark ? 'rgba(255,255,255,0.05)' : '#fff', color: t.text, fontSize: '14px', outline: 'none', resize: 'vertical' }} />
              <button style={{
                padding: '12px', borderRadius: '10px', background: '#738A6E', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                transition: 'background 0.2s'
              }}>
                Send Message
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{
        background: t.footerBg,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${t.border}`,
        padding: '48px 24px 32px',
        position: 'relative', zIndex: 2,
        transition: 'background 0.4s ease'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Top footer grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#344C3D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#FAFAF8', fontWeight: 800, fontSize: '13px' }}>R</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: '18px', color: t.text, letterSpacing: '-0.02em' }}>Rentsure</span>
              </div>
              <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.65, maxWidth: '240px' }}>
                The complete rental operating system. Trusted by vendors across India.
              </p>
            </div>
            {/* Links */}
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers'] },
              { heading: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>{heading}</div>
                {links.map(link => (
                  <div key={link} style={{ marginBottom: '10px' }}>
                    <a href="#" style={{ fontSize: '14px', color: t.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = t.text; }}
                      onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; }}>
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Bottom bar */}
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>© {new Date().getFullYear()} Rentsure. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              {[
                { icon: <Twitter size={18} />, label: 'Twitter' },
                { icon: <Linkedin size={18} />, label: 'LinkedIn' },
                { icon: <Github size={18} />, label: 'GitHub' }
              ].map(({ icon, label }) => (
                <a key={label} href="#" aria-label={label} style={{ color: t.textMuted, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.color = t.text; }}
                  onMouseLeave={e => { e.currentTarget.style.color = t.textMuted; }}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── VERTICAL SCROLL TRACKER ─────────────────────────── */}
      <div
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed', bottom: '40px', right: '40px', zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          cursor: 'pointer',
          opacity: scrollProgress > 0.02 ? 1 : 0,
          transform: scrollProgress > 0.02 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = scrollProgress > 0.02 ? 'translateY(0)' : 'translateY(20px)'; }}
      >
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '10px', fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.6 }}>
          Scroll to top
        </span>
        <div style={{ width: '2px', height: '80px', background: dark ? 'rgba(115,138,110,0.2)' : 'rgba(115,138,110,0.2)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%',
            height: `${scrollProgress * 100}%`,
            background: 'linear-gradient(to top, #344C3D, #738A6E)',
            borderRadius: '2px', transition: 'height 0.1s ease-out'
          }} />
        </div>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#344C3D', boxShadow: '0 0 8px rgba(52,76,61,0.5)' }} />
      </div>

    </div>
  );
}

function FeatureCard({ icon, title, desc, t }: { icon: React.ReactNode; title: string; desc: string; t: typeof LIGHT }) {
  return (
    <div
      style={{
        background: t.cardBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${t.border}`, borderRadius: '20px', padding: '28px',
        boxShadow: '0 4px 16px rgba(52,76,61,0.03)',
        transition: 'all 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: 'default'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-10px) scale(1.015)';
        e.currentTarget.style.background = t.cardHover;
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(52,76,61,0.1)';
        e.currentTarget.style.borderColor = t.accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.background = t.cardBg;
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(52,76,61,0.03)';
        e.currentTarget.style.borderColor = t.border;
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '11px',
        background: `rgba(115,138,110,0.13)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.accent, marginBottom: '20px',
        transition: 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(8deg) scale(1.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1)'; }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '17px', fontWeight: 700, color: t.text, marginBottom: '10px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: t.textMuted, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

function CountUp({ end, suffix = '', duration = 2000 }: { end: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let startTime: number | null = null;
          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeProgress * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (isDeleting) {
      if (displayed === '') {
        timer = setTimeout(() => setIsDeleting(false), 500);
      } else {
        timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 50);
      }
    } else {
      if (displayed === text) {
        timer = setTimeout(() => setIsDeleting(true), 2500);
      } else {
        timer = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 120);
      }
    }
    
    return () => clearTimeout(timer);
  }, [displayed, isDeleting, text]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse" style={{ fontWeight: 300, marginLeft: '2px', color: 'currentColor' }}>|</span>
    </span>
  );
}
