import React from 'react';
import { Outlet } from 'react-router-dom';

export function ManagerLayout() {
  return (
    <div className="manager-layout min-h-screen bg-slate-950 text-white">
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-blue-500 tracking-wider text-sm">AOTMS MANAGER</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
            Management Portal
          </span>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default ManagerLayout;
