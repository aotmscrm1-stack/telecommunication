import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-8xl font-black text-blue-500 tracking-wider mb-2">404</h1>
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-slate-400 max-w-md mb-8">
        The page you are looking for does not exist or has been relocated.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white transition-all"
      >
        Go to Home
      </button>
    </div>
  );
}

export default NotFound;
