import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useTheme from '../../hooks/useTheme';
import LoginForm from './LoginForm';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lw-root {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f1f5f9;
    position: relative;
    overflow: hidden;
  }

  .lw-bg-curve-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .lw-curve-glow {
    position: absolute;
    top: -80px;
    right: -80px;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(37, 99, 235, 0) 70%);
    filter: blur(50px);
  }

  .lw-curve-glow-left {
    position: absolute;
    top: 20vh;
    left: -100px;
    width: 450px;
    height: 450px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(96, 165, 250, 0.35) 0%, rgba(37, 99, 235, 0) 70%);
    filter: blur(60px);
  }

  .lw-content {
    position: relative;
    z-index: 10;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

export default function Login() {
  useTheme('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (credentials) => {
    if (credentials?.preventDefault) {
      credentials.preventDefault();
    }
    setError('');
    setLoading(true);

    const emailToUse = (typeof credentials?.email === 'string' ? credentials.email : form.email)?.trim();
    const passwordToUse = (typeof credentials?.password === 'string' ? credentials.password : form.password)?.trim();

    if (!emailToUse || !passwordToUse) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      await login(emailToUse, passwordToUse);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lw-root">
      <style>{styles}</style>
      
      {/* Premium Blue Organic Curve Background */}
      <div className="lw-bg-curve-container">
        <div className="lw-curve-glow" />
        <div className="lw-curve-glow-left" />
        
        {/* SVG Decorative Blue Curve */}
        <svg
          viewBox="0 0 1440 540"
          fill="none"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '54vh',
            minHeight: '380px',
            filter: 'drop-shadow(0 15px 30px rgba(37, 99, 235, 0.22))',
          }}
        >
          <path
            d="M0,0 L1440,0 L1440,320 C1080,480 640,240 0,440 Z"
            fill="url(#blueWaveGrad)"
          />
          <defs>
            <linearGradient id="blueWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="40%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
        </svg>

        {/* Secondary Soft Translucent Accent Layer */}
        <svg
          viewBox="0 0 1440 540"
          fill="none"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '56vh',
            minHeight: '400px',
            opacity: 0.35,
          }}
        >
          <path
            d="M0,0 L1440,0 L1440,360 C1000,500 500,280 0,480 Z"
            fill="url(#blueSoftGrad)"
          />
          <defs>
            <linearGradient id="blueSoftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="lw-content">
        <LoginForm
          form={form}
          setForm={setForm}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
