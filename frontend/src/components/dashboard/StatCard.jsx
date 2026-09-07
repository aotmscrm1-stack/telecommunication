import React from 'react';

const TEXT_MAIN = '#2d2d6b';
const TEXT_MUTED = '#888';

export const StatCard = ({ icon, label, value, sub, bg, iconColor }) => (
  <div 
    className="stat-card" 
    style={{ 
      background: '#fff', 
      border: '1px solid #e5e2f5', 
      borderRadius: 12, 
      padding: '18px 20px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: 16, 
      boxSizing: 'border-box', 
      width: '100%', 
      maxWidth: '100%', 
      overflow: 'hidden' 
    }}
  >
    <div 
      style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 12, 
        background: bg, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0 
      }}
    >
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, color: TEXT_MUTED, wordBreak: 'break-word' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_MAIN, lineHeight: 1.1, marginTop: 4, wordBreak: 'break-word' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, wordBreak: 'break-word' }}>{sub}</div>}
    </div>
  </div>
);

export default StatCard;
