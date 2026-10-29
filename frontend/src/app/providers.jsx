import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Toaster } from '../components/ui/sonner';
import leadNoteReminderService from '../services/leadNoteReminderService';

export function AppProviders({ children }) {
  useEffect(() => {
    leadNoteReminderService.init();
    return () => leadNoteReminderService.stop();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppProviders;


