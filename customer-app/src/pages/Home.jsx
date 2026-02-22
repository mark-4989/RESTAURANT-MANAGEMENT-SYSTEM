import React, { useEffect, useRef } from 'react';
import { useTable } from '../context/TableContext';
import { ArrowRight, Star } from 'lucide-react';
import gsap from 'gsap';
import foodLeft from '../assets/food-left.png';
import foodRight from '../assets/food-right.png';
import '../styles/home.css';

const Home = ({ onNavigate }) => {
  const { tableNumber, setTableNumber } = useTable();

  const containerRef  = useRef(null);
  const eyebrowRef    = useRef(null);
  const titleLine1Ref = useRef(null);
  const titleLine2Ref = useRef(null);
  const titleLine3Ref = useRef(null);
  const subtitleRef   = useRef(null);
  const ctaRef        = useRef(null);
  const statsRef      = useRef(null);
  const badgeRef      = useRef(null);
  const imgRef        = useRef(null);
  const decorRef      = useRef(null);

  /* ─── QR param ─── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('table');
    if (t) {
      setTableNumber(t);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setTableNumber]);

  /* ─── GSAP entrance ─── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // image slides in from right
      tl.from(imgRef.current, {
        x: 120, opacity: 0, duration: 1.2, ease: 'expo.out'
      })
      // decor orbs
      .from(decorRef.current, {
        scale: 0, opacity: 0, duration: 1, ease: 'back.out(1.4)'
      }, '-=0.8')
      // eyebrow
      .from(eyebrowRef.current, {
        y: 24, opacity: 0, duration: 0.6
      }, '-=0.6')
      // headline lines staggered
      .from([titleLine1Ref.current, titleLine2Ref.current, titleLine3Ref.current], {
        y: 80, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out'
      }, '-=0.3')
      .from(subtitleRef.current, {
        y: 20, opacity: 0, duration: 0.6
      }, '-=0.4')
      .from(ctaRef.current?.children || [], {
        y: 20, opacity: 0, duration: 0.5, stagger: 0.15
      }, '-=0.3')
      .from(statsRef.current?.children || [], {
        y: 20, opacity: 0, duration: 0.5, stagger: 0.1
      }, '-=0.2');

      if (badgeRef.current) {
        tl.from(badgeRef.current, {
          scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)'
        }, '-=0.6');
      }

      // subtle parallax on scroll
      const handleScroll = () => {
        const y = window.scrollY;
        if (imgRef.current)   gsap.to(imgRef.current,  { y: y * 0.15, duration: 0.3 });
        if (decorRef.current) gsap.to(decorRef.current, { y: y * 0.08, duration: 0.3 });
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }, containerRef);

    return () => ctx.revert();
  }, [tableNumber]);

  return (
    <div className="home-page" ref={containerRef}>

      {/* ── Noise texture overlay ── */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Ambient blobs ── */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      {/* ── Diagonal accent stripe ── */}
      <div className="diagonal-stripe" aria-hidden="true" />

      {/* ══════════ MAIN LAYOUT ══════════ */}
      <div className="hero-layout">

        {/* ─── LEFT: Copy ─── */}
        <div className="hero-copy">

          {/* Table badge */}
          {tableNumber && (
            <div className="table-badge" ref={badgeRef}>
              <span className="table-badge-dot" />
              Table {tableNumber} — Ready to Order
            </div>
          )}

          {/* Eyebrow */}
          <div className="hero-eyebrow" ref={eyebrowRef}>
            <Star size={12} fill="currentColor" />
            <span>Fine Dining &amp; Takeaway</span>
            <Star size={12} fill="currentColor" />
          </div>

          {/* Headline — three editorial lines */}
          <h1 className="hero-title">
            <span className="title-line title-line--serif" ref={titleLine1Ref}>Taste the</span>
            <span className="title-line title-line--display" ref={titleLine2Ref}>
              <em>Art of</em>
            </span>
            <span className="title-line title-line--bold" ref={titleLine3Ref}>DineSmart</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle" ref={subtitleRef}>
            {tableNumber
              ? `Your digital menu is live. Browse, order and pay — all from this screen.`
              : `Handcrafted dishes. Seamless ordering. Scan your table QR or explore the full menu below.`}
          </p>

          {/* CTAs */}
          <div className="cta-row" ref={ctaRef}>
            <button
              className="cta-primary"
              onClick={() => onNavigate?.('menu')}
            >
              <span>Explore Menu</span>
              <span className="cta-arrow"><ArrowRight size={18} /></span>
            </button>

            <button
              className="cta-ghost"
              onClick={() => onNavigate?.('reservations')}
            >
              Reserve a Table
            </button>
          </div>

          {/* Stats strip */}
          <div className="stats-strip" ref={statsRef}>
            <div className="stat">
              <span className="stat-num">120+</span>
              <span className="stat-label">Dishes</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">4.9★</span>
              <span className="stat-label">Rating</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">15 min</span>
              <span className="stat-label">Avg. Delivery</span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Hero image ─── */}
        <div className="hero-visual">

          {/* Decorative ring / orb behind image */}
          <div className="visual-decor" ref={decorRef}>
            <div className="decor-ring" />
            <div className="decor-glow" />
          </div>

          {/* Main food image */}
          <div className="food-frame" ref={imgRef}>
            <img
              src={foodRight}
              alt="Signature dish"
              className="food-img food-img--main"
            />
            {/* Floating pill card */}
            <div className="float-card float-card--top">
              <span className="float-card-emoji">🔥</span>
              <div>
                <p className="float-card-title">Chef's Special</p>
                <p className="float-card-sub">Today's featured dish</p>
              </div>
            </div>
            <div className="float-card float-card--bottom">
              <img src={foodLeft} alt="" className="float-thumb" />
              <div>
                <p className="float-card-title">New on the menu</p>
                <p className="float-card-sub">Seasonal selection</p>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /hero-layout */}

      {/* ── Scroll hint ── */}
      <div className="scroll-hint" aria-hidden="true">
        <span className="scroll-line" />
        <span className="scroll-label">Scroll</span>
      </div>

    </div>
  );
};

export default Home;