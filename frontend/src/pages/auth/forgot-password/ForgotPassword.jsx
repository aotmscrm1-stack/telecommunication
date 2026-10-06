import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">
      <h2 className="text-2xl font-bold text-white text-center mb-2">Forgot Password</h2>
      <p className="text-slate-400 text-sm text-center mb-6">Enter your email to receive a password reset link.</p>
      
      {submitted ? (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm text-center">
          If an account exists for {email}, a reset link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="user@example.com"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors">
            Send Reset Link
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-slate-400">
        Remember your password? <Link to="/login" className="text-cyan-400 hover:underline">Log In</Link>
      </div>
    </div>
  );
}
