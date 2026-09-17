import React from 'react';

const OXFORD_NAVY = '#1d3557';
const CERULEAN = '#457b9d';

export const StatCard = ({ icon, label, value, sub, bg, iconColor }) => (
  <div 
    className="stat-card" 
    style={{ 
      background: 'linear-gradient(145deg, #ffffff 0%, #f1faee 100%)', 
      border: '1px solid #a8dadc', 
      borderRadius: 14, 
      padding: '18px 20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 14, 
      boxSizing: 'border-box', 
      width: '100%', 
      maxWidth: '100%', 
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(29, 53, 87, 0.04)',
      transition: 'all 0.2s ease',
    }}
  >
    <div 
      style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 12, 
        background: bg || '#edf8f8', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0,
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)',
      }}
    >
      <span style={{ color: iconColor || CERULEAN, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: CERULEAN, wordBreak: 'break-word', letterSpacing: '-0.1px' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: OXFORD_NAVY, lineHeight: 1.15, marginTop: 4, wordBreak: 'break-word' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, fontWeight: 500, color: '#6097b9', marginTop: 3, wordBreak: 'break-word' }}>{sub}</div>}
    </div>
  </div>
);

export default StatCard;

