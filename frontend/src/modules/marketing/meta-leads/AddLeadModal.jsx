import React, { useState } from 'react';
import { FiX, FiUser, FiPhone, FiMail, FiMapPin, FiCompass, FiPlus, FiCheck } from 'react-icons/fi';
import { metaLeadsAPI } from '../../../services/api';

export default function AddLeadModal({ isOpen, onClose, campaign, campaigns = [], onLeadCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    interested: '',
    targetCampaign: campaign || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync campaign prop if changed
  React.useEffect(() => {
    if (campaign) {
      setFormData(prev => ({ ...prev, targetCampaign: campaign }));
    }
  }, [campaign]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanPhone = String(formData.phone || '').trim().replace(/\s+/g, '');
    const cleanDigits = cleanPhone.replace(/\D/g, '');

    if (!cleanPhone || cleanDigits.length < 10) {
      setError('Please enter a valid 10-digit phone number (Mandatory).');
      return;
    }

    const effectiveCampaign = formData.targetCampaign || campaign || 'General_Meta_Leads';

    setLoading(true);
    setError('');

    try {
      const payload = {
        campaign: effectiveCampaign,
        name: formData.name.trim() || 'Unknown Lead',
        fullName: formData.name.trim() || 'Unknown Lead',
        email: formData.email.trim(),
        phone: cleanPhone,
        city: formData.city.trim(),
        interested: formData.interested.trim(),
        course: formData.interested.trim(),
        source: 'manual_crm_entry'
      };

      const res = await metaLeadsAPI.create(payload);
      const created = res.data?.data || (Array.isArray(res.data) ? res.data[0] : res.data);

      if (onLeadCreated) {
        onLeadCreated(created, effectiveCampaign);
      }

      // Reset form & close
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        interested: '',
        targetCampaign: campaign || ''
      });
      onClose();
    } catch (err) {
      console.error('Failed to add lead:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const INTERESTED_SUGGESTIONS = [
    'Cyber Security',
    'SAP S/4 HANA',
    'Data Analytics & AI',
    'Python Full Stack',
    'Digital Marketing',
    'UI / UX Design',
    'Immediately',
    'Attend a demo session',
    'Within 7 days',
    'Weekend Batch'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              <FiPlus />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add Lead to Campaign</h3>
              <p style={{ margin: 0, fontSize: 11.5, color: '#e0f2fe' }}>
                Enter lead details with interested field
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 16
            }}
            title="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              {error}
            </div>
          )}

          {/* Campaign Selector / Badge */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
              CAMPAIGN
            </label>
            {campaigns && campaigns.length > 0 ? (
              <select
                name="targetCampaign"
                value={formData.targetCampaign}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                {campaigns.map((c, idx) => (
                  <option key={idx} value={c.campaign || c.name || c}>
                    {c.campaign || c.name || c}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  fontSize: 12.5,
                  fontWeight: 700
                }}
              >
                @{formData.targetCampaign || campaign || 'General_Meta_Leads'}
              </div>
            )}
          </div>

          {/* 1. Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              <FiUser style={{ color: '#0284c7' }} />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Moksha Swaroop"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 2. Phone (Mandatory) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiPhone style={{ color: '#16a34a' }} />
                <span>Phone Number</span>
              </span>
              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '1px 6px', borderRadius: 4, border: '1px solid #fecaca' }}>
                * Mandatory
              </span>
            </label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="e.g. +91 9391126124 or 9391126124"
              value={formData.phone}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                fontFamily: 'monospace',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 3. Email */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              <FiMail style={{ color: '#8b5cf6' }} />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="e.g. candidate@gmail.com"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 4. City */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              <FiMapPin style={{ color: '#e11d48' }} />
              <span>City / Location</span>
            </label>
            <input
              type="text"
              name="city"
              placeholder="e.g. Hyderabad, Vijayawada, Guntur"
              value={formData.city}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* 5. Interested */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
              <FiCompass style={{ color: '#ea580c' }} />
              <span>Interested / Course / Intent</span>
            </label>
            <input
              type="text"
              name="interested"
              placeholder="e.g. Cyber Security, Attend a demo session, Immediately"
              value={formData.interested}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {/* Quick Suggestions Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {INTERESTED_SUGGESTIONS.map((s, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFormData(prev => ({ ...prev, interested: s }))}
                  style={{
                    fontSize: 10.5,
                    padding: '2px 7px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: formData.interested === s ? '#ea580c' : '#f8fafc',
                    color: formData.interested === s ? '#ffffff' : '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: loading ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              {loading ? (
                <span>Adding Lead...</span>
              ) : (
                <>
                  <FiCheck />
                  <span>Save Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
