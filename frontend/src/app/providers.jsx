import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from '../components/ui/sonner';
import leadNoteReminderService from '../services/leadNoteReminderService';
import GlobalLeadNoteModal from '../components/common/GlobalLeadNoteModal';

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
          window.dispatchEvent(
            new CustomEvent('select-meta-campaign-lead', {
              detail: { campaign, leadId, openNote: true },
            })
          );
          window.dispatchEvent(
            new CustomEvent('open-lead-note-modal', {
              detail: { leadId, openNote: true },
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
  useEffect(() => {
    leadNoteReminderService.init();
    return () => leadNoteReminderService.stop();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <CallbackToastRedirectHandler />
        <GlobalLeadNoteModal />
        {children}
        <Toaster position="top-right" richColors closeButton visibleToasts={1} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppProviders;
