import React from 'react';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
