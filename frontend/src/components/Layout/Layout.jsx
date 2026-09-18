import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';
import useTheme, { roleToTheme } from '../../hooks/useTheme';
import useBreakpoint from '../../hooks/useBreakpoint';
import { SidebarProvider } from '../../context/SidebarContext';

function LayoutInner() {
  const { user } = useAuth();
  useTheme(roleToTheme(user?.role));
  const bp = useBreakpoint();

  const topbarH = bp === 'mobile' ? 64 : 80;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif", background: 'var(--theme-surface-faint)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Topbar />
      <main
        style={{
          marginLeft: 0,
          marginTop: topbarH,
          minHeight: `calc(100vh - ${topbarH}px)`,
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