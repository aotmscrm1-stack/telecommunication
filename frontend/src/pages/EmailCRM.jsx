import { useState, useEffect } from 'react';
import axios from 'axios';

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

const PURPLE     = '#5b3fc7';
const RED_ACCENT = '#ea4335';
const TEXT_MAIN  = '#1f2937';
const TEXT_MUTED = '#6b7280';
const BORDER     = '#e5e7eb';
const BG         = '#f9fafb';

export default function EmailCRM() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('leave_permission');
  const [leads, setLeads] = useState([]);

  // Form State
  const [fromEmail, setFromEmail] = useState('customer@domain.com');
  const [recipientEmail, setRecipientEmail] = useState('hr@aotms.com');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  
  // Custom Variables for live preview & body insertion
  const [employeeName, setEmployeeName] = useState('John Doe');
  const [daysCount, setDaysCount] = useState('2');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [endDate, setEndDate] = useState('2026-09-17');
  const [reason, setReason] = useState('Personal Urgent Work');
  const [phone, setPhone] = useState('9876543210');

  // UI & Feedback State
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState('');
  const [sentError, setSentError] = useState('');
  const [sentLogs, setSentLogs] = useState([]);

  // Load Templates & Leads on Mount
  useEffect(() => {
    // Load Templates
    api.get('/email/templates')
      .then(res => {
        const tmps = res.data?.templates || [];
        setTemplates(tmps);
        if (tmps.length > 0) {
          applyTemplate(tmps[0]);
        }
      })
      .catch(() => {});

    // Load Leads for Dropdown Selection
    api.get('/leads', { params: { limit: 100 } })
      .then(res => {
        const lList = res.data?.leads || res.data || [];
        setLeads(lList);
        if (lList.length > 0 && lList[0].email) {
          setFromEmail(lList[0].email);
          setSelectedLeadId(lList[0]._id);
          if (lList[0].name) setEmployeeName(lList[0].name);
          if (lList[0].phone) setPhone(lList[0].phone);
        }
      })
      .catch(() => {});
  }, []);

  const applyTemplate = (tmpl) => {
    setSelectedTemplateId(tmpl.id);
    if (!recipientEmail) setRecipientEmail('hr@aotms.com');

    let subText = tmpl.subject || '';
    let bodyText = tmpl.body || '';

    // Replace default placeholders
    subText = subText.replace(/\{\{employee_name\}\}/g, employeeName);
    bodyText = bodyText
      .replace(/\{\{employee_name\}\}/g, employeeName)
      .replace(/\{\{days\}\}/g, daysCount)
      .replace(/\{\{start_date\}\}/g, startDate)
      .replace(/\{\{end_date\}\}/g, endDate)
      .replace(/\{\{reason\}\}/g, reason)
      .replace(/\{\{health_reason\}\}/g, reason)
      .replace(/\{\{phone\}\}/g, phone)
      .replace(/\{\{student_name\}\}/g, employeeName)
      .replace(/\{\{course_name\}\}/g, 'Full Stack Web Development')
      .replace(/\{\{name\}\}/g, employeeName);

    setSubject(subText);
    setBody(bodyText);
  };

  const handleLeadSelect = (e) => {
    const lId = e.target.value;
    setSelectedLeadId(lId);
    if (!lId) return;
    const l = leads.find(item => item._id === lId);
    if (l) {
      if (l.email) setFromEmail(l.email); // Set From Email to Customer Email!
      if (l.name) setEmployeeName(l.name);
      if (l.phone) setPhone(l.phone);
    }
  };

  const handleSendEmail = async () => {
    if (!fromEmail.trim()) {
      setSentError('Please enter a valid Customer / From email address.');
      return;
    }
    if (!recipientEmail.trim()) {
      setSentError('Please enter a valid TO email address.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setSentError('Subject and Email Body cannot be empty.');
      return;
    }

    setSentError('');
    setSentSuccess('');
    setSending(true);

    try {
      const res = await api.post('/email/send', {
        fromEmail: fromEmail.trim(),
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        leadId: selectedLeadId || undefined,
        templateId: selectedTemplateId,
      });

      const succMsg = res.data.message || `Email sent from ${fromEmail} to ${recipientEmail}`;
      setSentSuccess(succMsg);

      // Add to sent log history
      setSentLogs(prev => [
        {
          id: Date.now(),
          recipient: recipientEmail,
          from: fromEmail,
          subject,
          via: res.data.details?.sentVia || 'n8n Automation',
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)', background: BG }}>
      {/* Top Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED_ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_MAIN }}>Email CRM & Template Center</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>Send emails to default target <strong style={{ color: RED_ACCENT }}>hr@aotms.com</strong> via n8n</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 12px', borderRadius: 12, border: '1px solid #a7f3d0' }}>
            ● Default Target TO: hr@aotms.com
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '4px 12px', borderRadius: 12, border: '1px solid #bae6fd' }}>
            ⚡ n8n Webhook Connected
          </span>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Side: Template Selector & Lead Picker */}
        <div style={{ width: 320, borderRight: `1px solid ${BORDER}`, background: '#fff', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>
            1. SELECT EMAIL TEMPLATE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {templates.map(t => {
              const isSelected = selectedTemplateId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: isSelected ? '#fef2f2' : '#ffffff',
                    border: `1.5px solid ${isSelected ? RED_ACCENT : BORDER}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = BG; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? RED_ACCENT : TEXT_MAIN }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                    Category: {t.category}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
            2. PICK CUSTOMER / SENDER (FROM)
          </div>
          <select
            value={selectedLeadId}
            onChange={handleLeadSelect}
            style={inputStyle}
          >
            <option value="">Select a Customer from CRM...</option>
            {leads.map(l => (
              <option key={l._id} value={l._id}>
                {l.name} ({l.email || 'No email'})
              </option>
            ))}
          </select>

          <div style={{ fontSize: 12, fontWeight: 800, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 }}>
            3. CUSTOMIZABLE VARIABLES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle}>Employee / Student Name</label>
              <input value={employeeName} onChange={e => setEmployeeName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Reason / Health Details</label>
              <input value={reason} onChange={e => setReason(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>

            <button
              onClick={() => {
                const currentTmpl = templates.find(t => t.id === selectedTemplateId);
                if (currentTmpl) applyTemplate(currentTmpl);
              }}
              style={{ marginTop: 6, padding: '8px 12px', background: '#f3f4f6', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: TEXT_MAIN, cursor: 'pointer' }}
            >
              🔄 Refresh Variables into Template
            </button>
          </div>
        </div>

        {/* Center: Email Editor & Form */}
        <div style={{ flex: 1, padding: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_MAIN, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Compose & Send Email
            </div>

            {/* From & To inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>From Email (Customer / Employee Email) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  placeholder="e.g. customer@gmail.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>To Email (Default HR Target) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="hr@aotms.com"
                  style={{ ...inputStyle, background: '#fef2f2', fontWeight: 600, color: RED_ACCENT }}
                />
              </div>
            </div>

            {/* Subject Line */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Subject Line <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter email subject line"
                style={{ ...inputStyle, fontWeight: 600 }}
              />
            </div>

            {/* Message Body */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email Message Body (Plain Text / Formatted) <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={9}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>

            {/* Feedback Notifications */}
            {sentError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#ef4444' }}>
                ⚠️ {sentError}
              </div>
            )}
            {sentSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#16a34a' }}>
                ✅ {sentSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                disabled={sending}
                onClick={handleSendEmail}
                style={{
                  padding: '11px 32px', background: sending ? '#a78bfa' : RED_ACCENT,
                  color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(234,67,53,0.25)', transition: 'all 0.15s'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {sending ? 'Dispatching Email...' : 'Click To Send Email (hr@aotms.com)'}
              </button>
            </div>
          </div>

          {/* Sent History Table */}
          {sentLogs.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN, marginBottom: 12 }}>Sent Email Activity Log</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: BG, textAlign: 'left', color: TEXT_MUTED }}>
                      <th style={{ padding: '8px 12px' }}>Time</th>
                      <th style={{ padding: '8px 12px' }}>From</th>
                      <th style={{ padding: '8px 12px' }}>To Recipient</th>
                      <th style={{ padding: '8px 12px' }}>Subject</th>
                      <th style={{ padding: '8px 12px' }}>Delivery Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentLogs.map(log => (
                      <tr key={log.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '8px 12px', color: TEXT_MUTED }}>{log.timestamp}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: RED_ACCENT }}>{log.from}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: TEXT_MAIN }}>{log.recipient}</td>
                        <td style={{ padding: '8px 12px', color: TEXT_MAIN }}>{log.subject}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                            {log.via}
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
        <div style={{ width: 340, borderLeft: `1px solid ${BORDER}`, background: '#f3f4f6', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MAIN, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Live Email Preview Card
          </div>

          <div style={{ background: '#ffffff', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            {/* Fake Email Client Header */}
            <div style={{ background: '#1e293b', color: '#fff', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>FROM: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{fromEmail}</span></div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>TO: <span style={{ color: '#fff', fontWeight: 600 }}>{recipientEmail || 'recipient@domain.com'}</span></div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: '#ffffff' }}>
                {subject || '(No subject line)'}
              </div>
            </div>

            {/* Email Body */}
            <div style={{ padding: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', minHeight: 200, background: '#ffffff' }}>
              {body || 'Select a template or write email content to preview here...'}
            </div>

            {/* Email Footer */}
            <div style={{ background: '#f8fafc', padding: '10px 16px', borderTop: '1px solid #e2e8f0', fontSize: 10.5, color: '#94a3b8', textAlign: 'center' }}>
              Sent from AOTMS HR Platform · hr@aotms.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: TEXT_MAIN, display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 12px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: TEXT_MAIN };
