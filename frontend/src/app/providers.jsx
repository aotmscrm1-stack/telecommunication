import React, { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Toaster } from '../components/ui/sonner';
import leadNoteReminderService from '../services/leadNoteReminderService';
import GlobalLeadNoteModal from '../components/common/GlobalLeadNoteModal';

// Public pages (landing, auth screens, error pages) are not the CRM workspace:
// no call-back / note reminder popup may ever appear there.
const PUBLIC_ROUTES = new Set([
  '/',
  '/landing',
  '/logo',
  '/login',
  '/signup',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-account',
  '/403',
  '/404',
  '/500',
]);

function isPublicRoute(pathname) {
  const path = String(pathname || '/').split('#')[0].split('?')[0].toLowerCase();
  const normalized = path.replace(/\/+$/, '') || '/';
  return PUBLIC_ROUTES.has(normalized);
}

/**
 * Starts the reminder engine only while a user is logged in AND is browsing the
 * CRM workspace. Before login, on the public landing / auth pages and right
 * after logout no timer, WebSocket or popup may exist.
 */
function ReminderServiceGate() {
  const { user, token } = useAuth();
  const location = useLocation();
  const userId = user?._id || user?.id || '';
  const inCrmWorkspace = Boolean(userId && token) && !isPublicRoute(location.pathname);

  useEffect(() => {
    if (!inCrmWorkspace) {
      leadNoteReminderService.stop();
      return undefined;
    }
    leadNoteReminderService.init();
    return () => leadNoteReminderService.stop();
  }, [inCrmWorkspace, userId]);

  return null;
}

function CallbackToastRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = (e) => {
      const detail = e.detail || {};
      const campaign = detail.campaign || '';
      const metaLeadId = detail.metaLeadId || '';
      const leadId = detail.leadId || '';

      if (campaign || metaLeadId) {
        const targetId = metaLeadId || leadId;
        const qs = new URLSearchParams();
        if (campaign) qs.set('campaign', campaign);
        if (targetId) qs.set('leadId', targetId);
        navigate(`/meta-leads?${qs.toString()}`);
        window.dispatchEvent(
          new CustomEvent('select-meta-campaign-lead', {
            detail: { campaign, leadId: targetId },
          })
        );
      } else if (leadId) {
        navigate(`/leads/${leadId}`);
      }
    };

    const handleLeadNoteRedirect = (e) => {
      const detail = e.detail || {};
      const campaign = detail.campaign || '';
      const leadId = detail.leadId || '';
      const isMeta = detail.isMeta || Boolean(campaign);

      if (isMeta || campaign) {
        const qs = new URLSearchParams();
        if (campaign) qs.set('campaign', campaign);
        if (leadId) qs.set('leadId', leadId);
        qs.set('openNote', 'true');
        navigate(`/meta-leads?${qs.toString()}`);
        setTimeout(() => {
          // Land on that exact student inside the campaign list ...
          window.dispatchEvent(
            new CustomEvent('select-meta-campaign-lead', {
              detail: { campaign, leadId, openNote: true },
            })
          );
          // ... and open the note box right there, for this lead only.
          window.dispatchEvent(
            new CustomEvent('open-global-lead-note-modal', {
              detail: {
                leadId,
                leadName: detail.leadName || '',
                status: detail.status || '',
                counsellorName: detail.counsellorName || '',
                campaign,
                isMeta: true,
              },
            })
          );
        }, 150);
      } else if (leadId) {
        navigate(`/leads/${leadId}?openNote=true`);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('open-lead-note-modal', {
              detail: { leadId, openNote: true },
            })
          );
        }, 150);
      }
    };

    window.addEventListener('redirect-to-callback-lead', handleRedirect);
    window.addEventListener('redirect-to-lead-note', handleLeadNoteRedirect);
    return () => {
      window.removeEventListener('redirect-to-callback-lead', handleRedirect);
      window.removeEventListener('redirect-to-lead-note', handleLeadNoteRedirect);
    };
  }, [navigate]);

  return null;
}

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReminderServiceGate />
        <CallbackToastRedirectHandler />
        <GlobalLeadNoteModal />
        {children}
        <Toaster position="bottom-right" richColors closeButton visibleToasts={1} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppProviders;
