import { Outlet } from 'react-router-dom';
import Navbar from '../dashboard/Navbar/Navbar';
import { useAuth } from '../../context/AuthContext';
import useTheme, { roleToTheme } from '../../hooks/useTheme';
import useBreakpoint from '../../hooks/useBreakpoint';
import { SidebarProvider } from '../../context/SidebarContext';

function LayoutInner() {
  const { user } = useAuth();
  useTheme(roleToTheme(user?.role));
  const bp = useBreakpoint();

  const navbarH = bp === 'mobile' ? 64 : 70;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />
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