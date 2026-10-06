import React from 'react';

export function Header({ title }) {
  return (
    <header className="h-16 px-6 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
      <h1 className="text-lg font-bold text-white">{title || 'AOTMS CRM'}</h1>
    </header>
  );
}

export default Header;
