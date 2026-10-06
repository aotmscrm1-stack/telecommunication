import React from 'react';
import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="admin-layout min-h-screen bg-slate-950 text-white">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-orange-500 tracking-wider text-sm">AOTMS ADMIN</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
            Administrator Mode
          </span>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
