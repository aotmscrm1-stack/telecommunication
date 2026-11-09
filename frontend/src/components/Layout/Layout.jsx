import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../dashboard/Navbar/Navbar';
import MandatoryAttendanceModal from '../Attendance/MandatoryAttendanceModal';
import { useAuth } from '../../context/AuthContext';
import useTheme, { roleToTheme } from '../../hooks/useTheme';
import useBreakpoint from '../../hooks/useBreakpoint';
import { SidebarProvider } from '../../context/SidebarContext';

function LayoutInner() {
  const { user } = useAuth();
  useTheme(roleToTheme(user?.role));
  const bp = useBreakpoint();
  const location = useLocation();
  const [navTransitioning, setNavTransitioning] = useState(false);

  const navbarH = bp === 'mobile' ? 74 : 80;

  // Track module / route changes
  useEffect(() => {
    setNavTransitioning(true);
    const t = setTimeout(() => setNavTransitioning(false), 450);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Global SVG Definitions for AOTMS Signature Orange & Blue Gradient */}
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <linearGradient id="aotms-signature-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="45%" stopColor="#FB923C" />
            <stop offset="85%" stopColor="#1677C8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sleek Module Switch Gradient Bar */}
      {navTransitioning && (
        <div
          className="fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none transition-all duration-300"
          style={{
            background: 'linear-gradient(90deg, #F97316 0%, #FB923C 35%, #1677C8 70%, #0284C7 100%)',
            boxShadow: '0 0 10px rgba(249, 115, 22, 0.45)',
          }}
        />
      )}

      <Navbar />
      <MandatoryAttendanceModal />
      <main
        style={{
          marginLeft: 0,
          marginTop: navbarH,
          minHeight: `calc(100vh - ${navbarH}px)`,
          width: '100%',
          maxWidth: '100%',
          overflowY: 'auto',
          overflowX: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}