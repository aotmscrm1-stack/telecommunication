import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex text-xs text-slate-400 py-2 px-4 bg-slate-900/50 rounded-lg">
      <Link to="/" className="hover:text-cyan-400">Home</Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        return (
          <span key={to} className="flex items-center">
            <span className="mx-2 text-slate-600">/</span>
            <Link to={to} className="capitalize hover:text-cyan-400">{value}</Link>
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;
