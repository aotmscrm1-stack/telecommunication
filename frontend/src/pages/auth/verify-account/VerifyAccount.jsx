import React from 'react';
import { Link } from 'react-router-dom';

export default function VerifyAccount() {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl text-center">
      <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Account Verification</h2>
      <p className="text-slate-400 text-sm mb-6">Your account verification status is being processed.</p>
      <Link to="/login" className="inline-block px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors">
        Proceed to Login
      </Link>
    </div>
  );
}
