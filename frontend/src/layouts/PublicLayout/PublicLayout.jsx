import React from 'react';
import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="public-layout min-h-screen bg-slate-950 text-white">
      <Outlet />
    </div>
  );
}

export default PublicLayout;
