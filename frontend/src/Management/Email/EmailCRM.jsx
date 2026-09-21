import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';

// Axios instance with auth token
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
    : '/api'
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('aotms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Color Palette: White, Blue, Orange
const BLUE_PRIMARY   = '#2563eb';
const BLUE_HOVER     = '#1d4ed8';
const BLUE_LIGHT     = '#eff6ff';
const BLUE_BORDER    = '#bfdbfe';

const ORANGE_PRIMARY = '#f97316';
const ORANGE_HOVER   = '#ea580c';
const ORANGE_LIGHT   = '#fff7ed';
const ORANGE_BORDER  = '#fed7aa';

const WHITE          = '#ffffff';
const TEXT_MAIN      = '#1e293b';
const TEXT_MUTED     = '#64748b';
const BORDER         = '#e2e8f0';
const BG             = '#f8fafc';

export default function EmailCRM() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('leave_template');

  // Form State
  const [recipientEmail, setRecipientEmail] = useState('hr@aotms.com');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // UI & Feedback State
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState('');
  const [sentError, setSentError] = useState('');
  const [sentLogs, setSentLogs] = useState([]);

  // Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');
  const [newTmplBody, setNewTmplBody] = useState('');
  const [creatingTmpl, setCreatingTmpl] = useState(false);
  const [createError, setCreateError] = useState('');

  // Sender email derived from logged-in user context
  const currentUserEmail = user?.email || 'user@aotms.com';

  const applyTemplate = (tmpl, currentUser) => {
    const u = currentUser || user;
    const empName = u?.name || 'Employee';
    const empDesignation = u?.designation || 'Staff';
    const empEmail = u?.email || 'user@aotms.com';
    const empPhone = u?.phone || '+91 9876543210';

    setSelectedTemplateId(tmpl.id);
    if (!recipientEmail) setRecipientEmail('hr@aotms.com');

    let subj = tmpl.subject || '';
    subj = subj
      .replace(/{{employee_name}}/g, empName)
      .replace(/{{designation}}/g, empDesignation);

    let bdy = tmpl.body || '';
    bdy = bdy
      .replace(/{{employee_name}}/g, empName)
      .replace(/{{designation}}/g, empDesignation)
      .replace(/{{email}}/g, empEmail)
      .replace(/{{phone}}/g, empPhone);

    setSubject(subj);
    setBody(bdy);
  };

  const loadTemplates = () => {
    api.get('/email/templates')
      .then(res => {
        const tmps = res.data?.templates || [];
        setTemplates(tmps);
        if (tmps.length > 0) {
          applyTemplate(tmps[0], user);
        }
      })
      .catch(() => {
        // Fallback Leave Template if offline
        const fallback = {
          id: 'leave_template',
          name: '1. Leave template',
          category: 'Leave Application',
          fromEmail: 'hr@aotms.com',
          subject: `Leave Application - ${user?.name || 'Employee'} (${user?.designation || 'Staff'})`,
          body: `Respected HR Team,

I am writing this email to formally request leave of absence.

Employee Details:
• Name: ${user?.name || 'Employee'}
• Designation: ${user?.designation || 'Staff'}
• Email: ${user?.email || 'user@aotms.com'}
• Contact: ${user?.phone || '+91 9876543210'}

Leave Details:
• Leave Type: Casual / Sick Leave
• From Date: [DD/MM/YYYY]
• To Date: [DD/MM/YYYY]
• Total Days: [1 Day]
• Reason: [Specify reason for leave]

I will ensure that all my pending tasks and responsibilities are properly handled and handed over prior to my leave. I will remain reachable on phone or email for any critical updates.

Kindly approve my leave request.

Thank you.

Sincerely,
${user?.name || 'Employee'}
${user?.designation || 'Staff'}`
        };
        setTemplates([fallback]);
        applyTemplate(fallback, user);
      });
  };

  // Load Templates on Mount or when User profile details resolve
  useEffect(() => {
    loadTemplates();
  }, [user?.email, user?.name, user?.designation]);

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!newTmplName.trim() || !newTmplBody.trim()) {
      setCreateError('Template name and body are required.');
      return;
    }
    setCreateError('');
    setCreatingTmpl(true);
    try {
      const res = await api.post('/email/templates', {
        name: newTmplName.trim(),
        subject: newTmplSubject.trim() || newTmplName.trim(),
        body: newTmplBody.trim(),
        category: 'Custom Template'
      });

      const created = res.data?.template;
      if (created) {
        setTemplates(prev => [...prev, created]);
        applyTemplate(created);
      }
      setShowCreateModal(false);
      setNewTmplName('');
      setNewTmplSubject('');
      setNewTmplBody('');
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create template');
    } finally {
      setCreatingTmpl(false);
    }
  };

  const handleDeleteTemplate = async (tmplId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/email/templates/${tmplId}`);
      setTemplates(prev => prev.filter(t => t.id !== tmplId));
      if (selectedTemplateId === tmplId && templates.length > 0) {
        applyTemplate(templates[0]);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      setSentError('Please enter a valid recipient email address.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setSentError('Subject and message body cannot be empty.');
      return;
    }

    setSentError('');
    setSentSuccess('');
    setSending(true);

    try {
      const res = await api.post('/email/send', {
        fromEmail: currentUserEmail,
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        templateId: selectedTemplateId,
      });

      const succMsg = res.data.message || `Email sent from ${currentUserEmail} to ${recipientEmail}`;
      setSentSuccess(succMsg);

      // Add to sent log history
      setSentLogs(prev => [
        {
          id: Date.now(),
          recipient: recipientEmail,
          from: currentUserEmail,
          subject,
          via: res.data.details?.sentVia || 'Email Service',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev
      ]);

    } catch (err) {
      setSentError(err.response?.data?.message || err.message || 'Failed to dispatch email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: BG, color: TEXT_MAIN }}>
      {/* Top Header */}
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ORANGE_PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: TEXT_MAIN, display: 'flex', alignItems: 'center', gap: 10 }}>
              Email CRM & Leave Management
              <span style={{ fontSize: 11, fontWeight: 500, color: ORANGE_PRIMARY, background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, padding: '2px 8px', borderRadius: 6 }}>
                Active: 1. Leave template
              </span>
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
              Send leave requests directly to <span style={{ color: BLUE_PRIMARY }}>hr@aotms.com</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: BLUE_PRIMARY, background: BLUE_LIGHT, padding: '5px 12px', borderRadius: 20, border: `1px solid ${BLUE_BORDER}` }}>
            ● Sender: {currentUserEmail} ({user?.designation || 'Staff'})
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: ORANGE_PRIMARY, background: ORANGE_LIGHT, padding: '5px 12px', borderRadius: 20, border: `1px solid ${ORANGE_BORDER}` }}>
            Direct Delivery Active
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Side: Template Selector */}
        <div style={{ width: 320, borderRight: `1px solid ${BORDER}`, background: WHITE, padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Email Templates ({templates.length})
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: ORANGE_PRIMARY,
                color: WHITE, border: 'none', borderRadius: 6,
                padding: '5px 10px', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = ORANGE_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = ORANGE_PRIMARY}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Create Template
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {templates.map(t => {
              const isSelected = selectedTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  style={{
                    padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                    background: isSelected ? ORANGE_LIGHT : WHITE,
                    border: `1px solid ${isSelected ? ORANGE_PRIMARY : BORDER}`,
                    boxShadow: isSelected ? '0 2px 8px rgba(249,115,22,0.1)' : 'none',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = BG; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = WHITE; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? ORANGE_PRIMARY : TEXT_MAIN }}>
                      {t.name}
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: WHITE, background: ORANGE_PRIMARY, padding: '2px 6px', borderRadius: 4 }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {t.category || 'Leave Application'}
                    </span>
                    <span style={{ fontSize: 10.5, color: BLUE_PRIMARY, fontWeight: 500 }}>
                      → {t.fromEmail || 'hr@aotms.com'}
                    </span>
                  </div>

                  {t.isCustom && canDelete(user) && (
                    <button
                      onClick={(e) => handleDeleteTemplate(t.id, e)}
                      title="Delete template"
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED,
                        padding: 4, borderRadius: 4
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Email Editor & Form */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', marginBottom: 20 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: TEXT_MAIN, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE_PRIMARY} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Compose & Send Email
              <span style={{ fontSize: 11, fontWeight: 500, color: BLUE_PRIMARY, background: BLUE_LIGHT, border: `1px solid ${BLUE_BORDER}`, padding: '2px 8px', borderRadius: 4, marginLeft: 4 }}>
                1. Leave template
              </span>
            </div>

            {/* To input */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>To Recipient Email <span style={{ color: ORANGE_PRIMARY }}>*</span></label>
              <input
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="hr@aotms.com"
                style={{ ...inputStyle, background: BLUE_LIGHT, color: BLUE_PRIMARY, borderColor: BLUE_BORDER }}
              />
            </div>

            {/* Subject Line */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Subject Line <span style={{ color: ORANGE_PRIMARY }}>*</span></label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter email subject line"
                style={inputStyle}
              />
            </div>

            {/* Message Body */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Email Message Body <span style={{ color: ORANGE_PRIMARY }}>*</span></label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={11}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.6 }}
              />
            </div>

            {/* Feedback Notifications */}
            {sentError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#ef4444' }}>
                ⚠️ {sentError}
              </div>
            )}
            {sentSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#16a34a' }}>
                ✓ {sentSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                disabled={sending}
                onClick={handleSendEmail}
                style={{
                  padding: '10px 28px', background: sending ? ORANGE_BORDER : ORANGE_PRIMARY,
                  color: WHITE, border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 500,
                  cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(249,115,22,0.2)', transition: 'background 0.15s'
                }}
                onMouseEnter={e => { if (!sending) e.currentTarget.style.background = ORANGE_HOVER; }}
                onMouseLeave={e => { if (!sending) e.currentTarget.style.background = ORANGE_PRIMARY; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {sending ? 'Sending Email...' : 'Send Leave Request (hr@aotms.com)'}
              </button>
            </div>
          </div>

          {/* Sent History Table */}
          {sentLogs.length > 0 && (
            <div style={{ background: WHITE, borderRadius: 10, border: `1px solid ${BORDER}`, padding: 18 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: TEXT_MAIN, marginBottom: 12 }}>
                Email Activity History
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: BG, textAlign: 'left', color: TEXT_MUTED }}>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Time</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>From</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>To Recipient</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Subject</th>
                      <th style={{ padding: '8px 12px', fontWeight: 500 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentLogs.map(log => (
                      <tr key={log.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '8px 12px', color: TEXT_MUTED }}>{log.timestamp}</td>
                        <td style={{ padding: '8px 12px', color: BLUE_PRIMARY }}>{log.from}</td>
                        <td style={{ padding: '8px 12px', color: TEXT_MAIN }}>{log.recipient}</td>
                        <td style={{ padding: '8px 12px', color: TEXT_MAIN }}>{log.subject}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 500, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Live Email Card Preview */}
        <div style={{ width: 330, borderLeft: `1px solid ${BORDER}`, background: WHITE, padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: TEXT_MAIN, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={BLUE_PRIMARY} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Email Live Preview
          </div>

          <div style={{ background: WHITE, borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            {/* Email Preview Header */}
            <div style={{ background: BLUE_PRIMARY, color: WHITE, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: BLUE_BORDER }}>FROM: <span style={{ color: WHITE }}>{currentUserEmail}</span></div>
              <div style={{ fontSize: 11, color: BLUE_BORDER, marginTop: 2 }}>TO: <span style={{ color: WHITE }}>{recipientEmail || 'hr@aotms.com'}</span></div>
              <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 8, color: WHITE }}>
                {subject || '(No subject line)'}
              </div>
            </div>

            {/* Email Preview Body */}
            <div style={{ padding: 16, fontSize: 12, color: TEXT_MAIN, lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 200, background: WHITE }}>
              {body || 'Select a template or write email content to preview here...'}
            </div>

            {/* Email Preview Footer */}
            <div style={{ background: BG, padding: '10px 14px', borderTop: `1px solid ${BORDER}`, fontSize: 10.5, color: TEXT_MUTED, textAlign: 'center' }}>
              Official Communication · AOTMS HR Portal
            </div>
          </div>
        </div>
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: WHITE, borderRadius: 12, width: 460, maxWidth: '92%',
            padding: 22, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: `1px solid ${BORDER}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT_MAIN, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: ORANGE_PRIMARY }}>+</span> Create New Email Template
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#ef4444' }}>
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateTemplate}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Template Name <span style={{ color: ORANGE_PRIMARY }}>*</span></label>
                <input
                  required
                  placeholder="e.g., Sick Leave, Permission Request"
                  value={newTmplName}
                  onChange={e => setNewTmplName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Subject Line</label>
                <input
                  placeholder="e.g., Leave Application - {{employee_name}}"
                  value={newTmplSubject}
                  onChange={e => setNewTmplSubject(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Template Message Body <span style={{ color: ORANGE_PRIMARY }}>*</span></label>
                <textarea
                  required
                  rows={6}
                  placeholder="Write template message content..."
                  value={newTmplBody}
                  onChange={e => setNewTmplBody(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }}
                />
                <div style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 4 }}>
                  Available tags: {'{{employee_name}}'}, {'{{designation}}'}, {'{{email}}'}, {'{{phone}}'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: TEXT_MAIN }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTmpl}
                  style={{
                    padding: '8px 18px', border: 'none', borderRadius: 6,
                    background: ORANGE_PRIMARY,
                    color: WHITE, fontSize: 12, fontWeight: 500,
                    cursor: creatingTmpl ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(249,115,22,0.2)'
                  }}
                  onMouseEnter={e => { if (!creatingTmpl) e.currentTarget.style.background = ORANGE_HOVER; }}
                  onMouseLeave={e => { if (!creatingTmpl) e.currentTarget.style.background = ORANGE_PRIMARY; }}
                >
                  {creatingTmpl ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 500, color: TEXT_MAIN, display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12.5, fontWeight: 500, outline: 'none', boxSizing: 'border-box', background: WHITE, color: TEXT_MAIN };
