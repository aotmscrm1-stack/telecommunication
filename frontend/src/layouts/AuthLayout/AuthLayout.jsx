import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="auth-layout min-h-screen bg-slate-950 text-white flex flex-col justify-center">
      <Outlet />
    </div>
  );
}

export default AuthLayout;
