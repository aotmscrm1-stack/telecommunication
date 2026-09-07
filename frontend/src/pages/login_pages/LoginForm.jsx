import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../../assets/aotms-global-logo.png';

export const LoginForm = ({
  form,
  setForm,
  showPass,
  setShowPass,
  loading,
  error,
  onSubmit,
  cardRef,
}) => {
  return (
    <div className="lw-right">
      <div className="lw-form-card" ref={cardRef}>
        {/* Right header logo for mobile */}
        <div className="lw-right-logo-area">
          <img src={logoImg} alt="AOTMS Logo" className="lw-right-logo-img" />
        </div>

        {/* Portal badge */}
        <div className="lw-portal-badge">
          <span className="lw-portal-dot" />
          <span className="lw-portal-text">AOTMS Sales Portal</span>
        </div>

        {/* Welcome Text */}
        <div className="lw-welcome">
          <h1>Welcome back</h1>
          <p>Log in to access your leads, dialer & campaigns dashboard.</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="lw-error">
            <div className="lw-err-icon">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="lw-form">
          <div className="lw-field">
            <label className="lw-label">Work Email</label>
            <div className="lw-input-wrap">
              <span className="lw-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              </span>
              <input
                type="email"
                className="lw-input"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="lw-field">
            <div className="lw-label-row">
              <label className="lw-label">Password</label>
              <Link to="/forgot-password" className="lw-forgot">Forgot Password?</Link>
            </div>
            <div className="lw-input-wrap">
              <span className="lw-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                className="lw-input"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lw-eye"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          <div className="lw-field">
            <button type="submit" className="lw-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="lw-spinner" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Workspace</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="lw-footer">
          &copy; {new Date().getFullYear()} AOTMS Telecommunication. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
