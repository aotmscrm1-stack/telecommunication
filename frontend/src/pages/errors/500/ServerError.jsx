import React from 'react';
import { useNavigate } from 'react-router-dom';

export function ServerError() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-8xl font-black text-rose-500 tracking-wider mb-2">500</h1>
      <h2 className="text-2xl font-bold mb-4">Internal Server Error</h2>
      <p className="text-slate-400 max-w-md mb-8">
        Something went wrong on our end. Please refresh or try again later.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all"
      >
        Back to Safety
      </button>
    </div>
  );
}

export default ServerError;
