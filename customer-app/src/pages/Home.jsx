import React, { useEffect, useRef } from 'react';
import { useTable } from '../context/TableContext';
import { Utensils, Package, ArrowRight, Sparkles } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import foodLeft from '../assets/food-left.png';
import foodRight from '../assets/food-right.png';
import '../styles/home.css';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const Home = ({ onNavigate }) => {
  const { tableNumber, setTableNumber } = useTable();
  
  // Refs for GSAP animations
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonsRef = useRef(null);
  const badgeRef = useRef(null);
  const foodLeftRef = useRef(null);
  const foodRightRef = useRef(null);
  const qrSectionRef = useRef(null);

  useEffect(() => {
    // Get table number from URL query parameter (from QR code scan)
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromURL = urlParams.get('table');
    
    if (tableFromURL) {
      console.log('📱 QR Code Scanned! Table:', tableFromURL);
      setTableNumber(tableFromURL);
      showWelcomeToast(tableFromURL);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setTableNumber]);

  useEffect(() => {
    // GSAP Animation Timeline
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Animate hero content
      tl.from(titleRef.current, {
        y: 100,
        opacity: 0,
        duration: 1,
        scale: 0.8,
      })
      .from(subtitleRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.8,
      }, '-=0.5')
      .from(buttonsRef.current.children, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        scale: 0.9,
      }, '-=0.4');

      // Animate table badge if present
      if (badgeRef.current) {
        tl.from(badgeRef.current, {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          ease: 'back.out(1.7)',
        }, '-=0.8');
      }

      // Animate QR section if present
      if (qrSectionRef.current) {
        tl.from(qrSectionRef.current, {
          y: 50,
          opacity: 0,
          duration: 0.8,
        }, '-=0.3');
      }

      // Floating food animations with parallax
      gsap.to(foodLeftRef.current, {
        y: -30,
        x: 15,
        rotation: 5,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to(foodRightRef.current, {
        y: -25,
        x: -15,
        rotation: -5,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // Mouse parallax effect
      const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const xPos = (clientX / window.innerWidth - 0.5) * 30;
        const yPos = (clientY / window.innerHeight - 0.5) * 30;

        gsap.to(foodLeftRef.current, {
          x: -xPos,
          y: -yPos,
          duration: 0.5,
          ease: 'power2.out',
        });

        gsap.to(foodRightRef.current, {
          x: xPos,
          y: yPos,
          duration: 0.5,
          ease: 'power2.out',
        });
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }, heroRef);

    return () => ctx.revert();
  }, [tableNumber]);

  const showWelcomeToast = (table) => {
    const welcomeMsg = document.createElement('div');
    welcomeMsg.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 1rem 2rem;
      border-radius: 50px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;
    welcomeMsg.textContent = `✅ Welcome to Table ${table}!`;
    document.body.appendChild(welcomeMsg);
    
    gsap.from(welcomeMsg, {
      y: -100,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.7)',
    });
    
    setTimeout(() => {
      gsap.to(welcomeMsg, {
        y: -100,
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          if (document.body.contains(welcomeMsg)) {
            document.body.removeChild(welcomeMsg);
          }
        },
      });
    }, 3000);
  };

  const handleViewMenu = () => {
    if (onNavigate) {
      onNavigate('menu');
    }
  };

  const handleTrackOrder = () => {
    if (onNavigate) {
      onNavigate('my-orders');
    }
  };

  return (
    <div className="home-page" ref={heroRef}>
      {/* Animated Background Food Images */}
      <div 
        ref={foodLeftRef}
        className="bg-food-left" 
        style={{ backgroundImage: `url(${foodLeft})` }}
      ></div>
      <div 
        ref={foodRightRef}
        className="bg-food-right" 
        style={{ backgroundImage: `url(${foodRight})` }}
      ></div>

      {/* Floating decorative elements */}
      <div className="floating-sparkles">
        <Sparkles className="sparkle sparkle-1" size={24} />
        <Sparkles className="sparkle sparkle-2" size={18} />
        <Sparkles className="sparkle sparkle-3" size={20} />
      </div>
      
      <div className="hero-section">
        {/* Show table number if available */}
        {tableNumber && (
          <div className="table-badge" ref={badgeRef}>
            <span className="table-badge-text">
              🍽️ Table {tableNumber}
            </span>
          </div>
        )}

        {/* Main Hero Content */}
        <div className="hero-content">
          <h1 className="hero-title" ref={titleRef}>
            Welcome to
            <span className="brand-highlight"> DineSmart</span>
          </h1>
          
          <p className="hero-subtitle" ref={subtitleRef}>
            {tableNumber 
              ? `Your digital menu is ready at Table ${tableNumber}` 
              : 'Experience the future of dining'}
          </p>
          
          <div className="cta-buttons" ref={buttonsRef}>
            <button 
              onClick={handleViewMenu}
              className="cta-btn cta-btn-primary"
            >
              <Utensils size={20} />
              <span>View Menu</span>
              <ArrowRight size={18} className="arrow-icon" />
            </button>
            
            <button 
              onClick={handleTrackOrder}
              className="cta-btn cta-btn-secondary"
            >
              <Package size={20} />
              <span>My Orders</span>
            </button>
          </div>
        </div>

        {/* QR Code Instructions */}
        {!tableNumber && (
          <div className="qr-section" ref={qrSectionRef}>
            <div className="qr-content">
              <div className="qr-icon-wrapper">
                <div className="qr-icon-bg"></div>
                <svg className="qr-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="7" height="7" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" strokeWidth="2"/>
                </svg>
              </div>
              <div className="qr-text">
                <p className="qr-title">Scan QR Code at Your Table</p>
                <p className="qr-description">
                  Or browse our menu and place orders directly from here
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gradient orbs for background effect */}
      <div className="gradient-orb orb-1"></div>
      <div className="gradient-orb orb-2"></div>
    </div>
  );
};

export default Home;