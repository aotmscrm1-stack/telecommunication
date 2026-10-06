import React from 'react';
import { useNavigate } from 'react-router-dom';

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-8xl font-black text-orange-500 tracking-wider mb-2">403</h1>
      <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
      <p className="text-slate-400 max-w-md mb-8">
        You do not have permission to view this resource. Contact your Administrator or HR if you require access.
      </p>
      <button
        onClick={() => navigate('/tasks')}
        className="px-6 py-3 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-slate-950 transition-all"
      >
        Return to My Workspace
      </button>
    </div>
  );
}

export default Forbidden;
