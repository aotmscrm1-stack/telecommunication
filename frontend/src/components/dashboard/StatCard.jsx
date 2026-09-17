import React from 'react';

const OXFORD_NAVY = '#1d3557';
const CERULEAN = '#457b9d';

export const StatCard = ({ icon, label, value, sub, bg, iconColor }) => (
  <div 
    className="stat-card" 
    style={{ 
      background: 'linear-gradient(145deg, #ffffff 0%, #f1faee 100%)', 
      border: '1.5px solid #a8dadc', 
      borderRadius: 16, 
      padding: '20px 22px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 16, 
      boxSizing: 'border-box', 
      width: '100%', 
      maxWidth: '100%', 
      overflow: 'hidden',
      boxShadow: '0 4px 18px rgba(29, 53, 87, 0.05)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
  >
    <div 
      style={{ 
        width: 52, 
        height: 52, 
        borderRadius: 14, 
        background: bg || '#dcf0f1', 
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
      <div style={{ fontSize: 14, fontWeight: 700, color: CERULEAN, wordBreak: 'break-word', letterSpacing: '-0.2px' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: OXFORD_NAVY, lineHeight: 1.1, marginTop: 4, wordBreak: 'break-word', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6097b9', marginTop: 3, wordBreak: 'break-word' }}>{sub}</div>}
    </div>
  </div>
);

export default StatCard;
