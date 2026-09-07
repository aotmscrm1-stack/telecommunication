import React from 'react';

const PURPLE = '#5b3fc7';
const TEXT_MAIN = '#2d2d6b';
const TEXT_MUTED = '#888';
const GREEN = '#22a163';
const RED = '#e53e3e';

export const UserAnalysisModal = ({ userId, data, loading, onClose }) => {
  if (!userId) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          padding: 24,
          position: 'relative',
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#f3f1fb',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontWeight: 'bold',
            color: TEXT_MAIN,
          }}
        >
          ✕
        </button>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div className="spinner-gradient" style={{ width: 28, height: 28 }} />
          </div>
        ) : data ? (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: TEXT_MAIN, margin: '0 0 4px' }}>
              {data.user?.name || 'Caller Analysis'}
            </h3>
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: '0 0 20px' }}>
              {data.user?.email} ({data.user?.role || 'Caller'})
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f8f7ff', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>Total Calls</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_MAIN, marginTop: 2 }}>
                  {data.totalCalls || 0}
                </div>
              </div>
              <div style={{ background: '#e8f8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: GREEN }}>Won Leads</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, marginTop: 2 }}>
                  {data.wonLeads || 0}
                </div>
              </div>
              <div style={{ background: '#fff0f0', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: RED }}>Lost Leads</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: RED, marginTop: 2 }}>
                  {data.lostLeads || 0}
                </div>
              </div>
            </div>

            {data.statusBreakdown && (
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN, marginBottom: 10 }}>
                  Lead Status Breakdown
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(data.statusBreakdown).map(([status, count]) => (
                    <div 
                      key={status} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '8px 12px', 
                        background: '#faf9ff', 
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: TEXT_MAIN, fontWeight: 500 }}>{status}</span>
                      <span style={{ fontWeight: 700, color: PURPLE }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: TEXT_MUTED, textAlign: 'center', padding: 20 }}>
            Unable to load user analysis details.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalysisModal;
