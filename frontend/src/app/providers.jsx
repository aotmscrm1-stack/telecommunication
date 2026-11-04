import React, { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from '../components/ui/sonner';
import leadNoteReminderService from '../services/leadNoteReminderService';

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

    window.addEventListener('redirect-to-callback-lead', handleRedirect);
    return () => window.removeEventListener('redirect-to-callback-lead', handleRedirect);
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
        {children}
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppProviders;


