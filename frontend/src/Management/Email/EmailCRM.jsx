import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete, isManagingDirector, isExecutive } from '../../utils/permissions';
import SplitText from '../../components/ui/SplitText';
import ShinyText from '../../components/ui/ShinyText';

// Axios instance with sanitized baseURL
const rawBaseUrl = import.meta.env.VITE_API_URL || '';
const cleanBaseUrl = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
const api = axios.create({
  baseURL: cleanBaseUrl ? `${cleanBaseUrl}/api` : '/api'
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('aotms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Gmail & Brand Colors (Clean White, Google Blue, Sunset Orange accents)
const GMAIL_BLUE       = '#1a73e8';
const GMAIL_BLUE_HOVER = '#1557b0';
const GMAIL_BLUE_LIGHT = '#e8f0fe';

const ORANGE_PRIMARY   = '#f97316';
const ORANGE_LIGHT     = '#fff7ed';
const ORANGE_BORDER    = '#fed7aa';

const WHITE            = '#ffffff';
const TEXT_MAIN        = '#202124';
const TEXT_MUTED       = '#5f6368';
const BORDER_LIGHT     = '#dadce0';
const ROW_HOVER        = '#f2f6fc';
const SIDEBAR_ACTIVE   = '#d3e3fd';

export default function EmailCRM() {
  const { user } = useAuth();
  const isMD = isManagingDirector(user) || isExecutive(user);

  // Active Navigation Tab: 'sent', 'leaves', 'inbox', 'templates', 'admin_audit'
  const [activeFolder, setActiveFolder] = useState('sent');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('leave_template');

  // Gmail Floating Compose State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeMaximized, setComposeMaximized] = useState(false);

  // Compose Fields: From & To are both editable for ANY customer email
  const [fromEmail, setFromEmail] = useState(user?.email || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Send state & feedback
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState('');
  const [sentError, setSentError] = useState('');

  // Email Logs & Reading Pane State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [starredEmails, setStarredEmails] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Inbound & Reply States (Message mail notification style)
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState('');
  const [replyError, setReplyError] = useState('');
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);

  // Admin / MD Tracking Portal State
  const [mdStats, setMdStats] = useState(null);
  const [trackingUsers, setTrackingUsers] = useState([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');

  // Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplSubject, setNewTmplSubject] = useState('');
  const [newTmplBody, setNewTmplBody] = useState('');
  const [creatingTmpl, setCreatingTmpl] = useState(false);
  const [createError, setCreateError] = useState('');

  // Initialize sender with user profile email
  useEffect(() => {
    if (user?.email && (!fromEmail || fromEmail === 'user@aotms.com')) {
      setFromEmail(user.email);
    }
  }, [user?.email]);

  const applyTemplate = (tmpl, currentUser) => {
    const u = currentUser || user;
    const empName = u?.name || 'Employee';
    const empDesignation = u?.designation || 'Staff';
    const empEmail = u?.email || fromEmail || 'user@aotms.com';
    const empPhone = u?.phone || '+91 9876543210';

    setSelectedTemplateId(tmpl.id);
    if (tmpl.id === 'leave_template' && !recipientEmail) {
      setRecipientEmail('hr@aotms.com');
    }

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
• Email: ${user?.email || fromEmail}
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

  const fetchEmailLogs = (empFilter = selectedEmployeeFilter, search = searchQuery) => {
    setLoadingLogs(true);
    let url = `/email/logs?employeeId=${empFilter}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    api.get(url)
      .then(res => {
        const fetchedLogs = res.data?.logs || [];
        setLogs(fetchedLogs);
        if (res.data?.stats) setMdStats(res.data.stats);
        if (res.data?.unreadCount !== undefined) setUnreadCount(res.data.unreadCount);
        if (res.data?.totalInbox !== undefined) setInboxCount(res.data.totalInbox);

        // Keep selectedEmail fresh with newest replies
        setSelectedEmail(prev => {
          if (!prev) return null;
          const fresh = fetchedLogs.find(l => (l._id || l.id) === (prev._id || prev.id));
          return fresh || prev;
        });
      })
      .catch(err => {
        console.warn('Failed to load email logs:', err.message);
      })
      .finally(() => setLoadingLogs(false));
  };

  const fetchTrackingUsers = () => {
    api.get('/email/tracking-users')
      .then(res => {
        setTrackingUsers(res.data?.users || []);
      })
      .catch(err => console.warn('Failed to load tracking users:', err.message));
  };

  useEffect(() => {
    loadTemplates();
    fetchEmailLogs('all', '');
    fetchTrackingUsers();
  }, [user?.email, user?.name, user?.designation]);

  // Background auto-refresh every 15s to pull incoming replies from n8n webhook
  useEffect(() => {
    const timer = setInterval(() => {
      let url = `/email/logs?employeeId=${selectedEmployeeFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      api.get(url).then(res => {
        const fetchedLogs = res.data?.logs || [];
        setLogs(fetchedLogs);
        if (res.data?.unreadCount !== undefined) setUnreadCount(res.data.unreadCount);
        if (res.data?.totalInbox !== undefined) setInboxCount(res.data.totalInbox);
        setSelectedEmail(prev => {
          if (!prev) return null;
          const fresh = fetchedLogs.find(l => (l._id || l.id) === (prev._id || prev.id));
          return fresh || prev;
        });
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedEmployeeFilter, searchQuery]);

  const handleSelectEmail = (log) => {
    setSelectedEmail(log);
    setInlineReplyText('');
    setReplySuccess('');
    setReplyError('');
    if (log && log.isRead === false) {
      api.patch(`/email/logs/${log._id || log.id}/read`).catch(() => {});
      setLogs(prev => prev.map(l => (l._id === log._id ? { ...l, isRead: true } : l)));
    }
  };

  const handleSendInlineReply = async () => {
    if (!inlineReplyText.trim() || !selectedEmail) return;
    setReplying(true);
    setReplySuccess('');
    setReplyError('');

    const targetRecipient = selectedEmail.direction === 'inbound'
      ? selectedEmail.fromEmail
      : (selectedEmail.recipientEmail || selectedEmail.fromEmail);

    try {
      const mySenderEmail = (fromEmail || user?.email || (selectedEmail.direction === 'inbound' ? selectedEmail.recipientEmail : selectedEmail.fromEmail) || '').trim();
      const res = await api.post('/email/reply', {
        emailId: selectedEmail._id || selectedEmail.id,
        fromEmail: mySenderEmail,
        body: inlineReplyText.trim(),
        toEmail: targetRecipient,
        subject: selectedEmail.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject || 'Message'}`
      });

      const newReply = res.data?.reply;
      if (newReply) {
        setSelectedEmail(prev => ({
          ...prev,
          replies: [...(prev.replies || []), newReply]
        }));
      }
      setInlineReplyText('');
      setReplySuccess('Reply sent successfully!');
      setTimeout(() => setReplySuccess(''), 3000);
      fetchEmailLogs(selectedEmployeeFilter, searchQuery);
    } catch (err) {
      setReplyError(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarredEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendEmail = async () => {
    if (!fromEmail.trim()) {
      setSentError('Please enter a valid "From Email" sender address.');
      return;
    }
    if (!recipientEmail.trim()) {
      setSentError('Please enter a valid "To Recipient Email" address.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setSentError('Subject line and email body cannot be empty.');
      return;
    }

    setSentError('');
    setSentSuccess('');
    setSending(true);

    try {
      // Background auto-tracking for Managing Director / Admin without showing banner to user
      const res = await api.post('/email/send', {
        fromEmail: fromEmail.trim(),
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        templateId: selectedTemplateId,
        trackMD: true, // Always automatically logged in portal
      });

      const succMsg = res.data?.message || `Email sent successfully to ${recipientEmail}`;
      setSentSuccess(succMsg);

      // Close compose modal after brief display
      setTimeout(() => {
        setComposeOpen(false);
        setSentSuccess('');
      }, 1500);

      fetchEmailLogs(selectedEmployeeFilter, searchQuery);

    } catch (err) {
      const resData = err.response?.data;
      const detectedMsg =
        resData?.message ||
        resData?.error ||
        (resData?.details && typeof resData.details === 'string' ? resData.details : null) ||
        err.message ||
        'Failed to dispatch email via n8n webhook';

      setSentError(detectedMsg);
      // Refresh logs so that the "Failed" log entry immediately appears in the list!
      fetchEmailLogs(selectedEmployeeFilter, searchQuery);
    } finally {
      setSending(false);
    }
  };

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

  // Filter logs based on activeFolder tab
  const displayedLogs = logs.filter(log => {
    if (activeFolder === 'inbox') {
      return log.direction === 'inbound' || (log.replies && log.replies.length > 0);
    }
    if (activeFolder === 'sent') {
      return log.direction !== 'inbound';
    }
    if (activeFolder === 'leaves') {
      return log.isLeaveRequest || /leave|absence|permission/i.test(log.subject);
    }
    if (activeFolder === 'admin_audit' && isMD) {
      return true;
    }
    return true;
  });

  const inboxRepliesCount = logs.filter(l => l.direction === 'inbound' || (l.replies && l.replies.length > 0)).length;
  const unreadRepliesCount = logs.filter(l => l.isRead === false).length;
  const leaveRequestsCount = logs.filter(l => l.isLeaveRequest || /leave|absence|permission/i.test(l.subject)).length;
  const sentCount = logs.filter(l => l.direction !== 'inbound').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: WHITE, color: TEXT_MAIN, fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', overflow: 'hidden' }}>
      {/* ── 1. GMAIL STYLE TOP SEARCH & APP BAR ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', borderBottom: `1px solid ${BORDER_LIGHT}`, background: WHITE, flexShrink: 0, height: 56 }}>
        {/* Brand / Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 230 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: GMAIL_BLUE_LIGHT, color: GMAIL_BLUE }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#3c4043', display: 'flex', alignItems: 'center', gap: 8 }}>
              Mail
              <span style={{ fontSize: 11, fontWeight: 600, color: GMAIL_BLUE, background: GMAIL_BLUE_LIGHT, padding: '2px 8px', borderRadius: 4 }}>
                AOTMS Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Gmail Search Box */}
        <div style={{ flex: 1, maxWidth: 680, margin: '0 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f3f4', borderRadius: 28, padding: '0 16px', height: 44, border: '1px solid transparent', transition: 'all 0.2s', boxShadow: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" style={{ marginRight: 12 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                fetchEmailLogs(selectedEmployeeFilter, e.target.value);
              }}
              placeholder="Search in mail by subject, sender or recipient..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: TEXT_MAIN }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchEmailLogs(selectedEmployeeFilter, '');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, fontSize: 16, padding: '0 4px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Status Badges & Webhook Config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowWebhookModal(true)}
            title="Incoming Email & Reply Webhook Setup"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f3e8ff', color: '#6b21a8',
              border: '1px solid #d8b4fe',
              padding: '6px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9333ea', display: 'inline-block' }}></span>
            Inbound Webhook
          </button>

          <button
            onClick={() => fetchEmailLogs(selectedEmployeeFilter, searchQuery)}
            title="Refresh mail"
            style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: TEXT_MUTED }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 6px', background: '#f8f9fa', borderRadius: 20, border: `1px solid ${BORDER_LIGHT}` }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: GMAIL_BLUE, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_MAIN }}>
              {user?.name || 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN LAYOUT: GMAIL SIDEBAR + CONTENT PANE ────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Gmail Left Sidebar */}
        <div style={{ width: 250, padding: '16px 12px', borderRight: `1px solid ${BORDER_LIGHT}`, background: WHITE, display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, overflowY: 'auto' }}>
          {/* Iconic Gmail "+ Compose" Pill Button */}
          <button
            onClick={() => {
              setComposeOpen(true);
              setComposeMinimized(false);
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '0 24px', height: 52,
              background: '#c2e7ff', color: '#001d35',
              border: 'none', borderRadius: 16,
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              transition: 'all 0.2s',
              marginBottom: 16,
              alignSelf: 'flex-start'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.12)';
              e.currentTarget.style.background = '#b3ddfc';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
              e.currentTarget.style.background = '#c2e7ff';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Compose
          </button>

          {/* Folder Item: Inbox & Replies */}
          <div
            onClick={() => { setActiveFolder('inbox'); setSelectedEmail(null); }}
            style={getSidebarItemStyle(activeFolder === 'inbox')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M22 12h-6l-2 3h-4l-2-3H2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7z"/><path d="M5.45 5.11L2 12v0h20v0l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              <span>Inbox & Replies</span>
            </div>
            {inboxRepliesCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: unreadRepliesCount > 0 ? '#7c3aed' : '#e2e8f0', color: unreadRepliesCount > 0 ? WHITE : TEXT_MAIN, padding: '1px 7px', borderRadius: 10 }}>
                {inboxRepliesCount}
              </span>
            )}
          </div>

          {/* Folder Item: Sent / Outbox */}
          <div
            onClick={() => { setActiveFolder('sent'); setSelectedEmail(null); }}
            style={getSidebarItemStyle(activeFolder === 'sent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span>Sent</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>{sentCount}</span>
          </div>

          {/* Folder Item: Leave Requests */}
          <div
            onClick={() => { setActiveFolder('leaves'); setSelectedEmail(null); }}
            style={getSidebarItemStyle(activeFolder === 'leaves')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ORANGE_PRIMARY} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Leave Requests</span>
            </div>
            {leaveRequestsCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: ORANGE_PRIMARY, color: WHITE, padding: '1px 7px', borderRadius: 10 }}>
                {leaveRequestsCount}
              </span>
            )}
          </div>

          {/* Folder Item: Templates */}
          <div
            onClick={() => { setActiveFolder('templates'); setSelectedEmail(null); }}
            style={getSidebarItemStyle(activeFolder === 'templates')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span>Templates</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>{templates.length}</span>
          </div>

          {/* Folder Item: Admin Audit Records (Automatically available for MD / Admin) */}
          {isMD && (
            <div
              onClick={() => { setActiveFolder('admin_audit'); setSelectedEmail(null); }}
              style={getSidebarItemStyle(activeFolder === 'admin_audit')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GMAIL_BLUE} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Admin Audit Records</span>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, background: GMAIL_BLUE, color: WHITE, padding: '1px 6px', borderRadius: 10 }}>
                MD
              </span>
            </div>
          )}

          {/* Sidebar Footer Indicator */}
          <div style={{ marginTop: 'auto', padding: '12px 8px', borderTop: `1px solid ${BORDER_LIGHT}`, fontSize: 11, color: TEXT_MUTED }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#188038', fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#188038', display: 'inline-block' }}></span>
              Live Mail & Reply Sync Active
            </div>
          </div>
        </div>

        {/* ── 3. CONTENT AREA: GMAIL STYLE MESSAGE LIST & REACT BITS HEADER ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafd', overflow: 'hidden' }}>
          {/* Header Banner using React Bits SplitText & ShinyText */}
          <div style={{ background: WHITE, padding: '14px 24px', borderBottom: `1px solid ${BORDER_LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* React Bits SplitText component */}
                <SplitText
                  text={activeFolder === 'leaves' ? 'Leave Requests History' : activeFolder === 'admin_audit' ? 'Admin Audit Trail & Staff Records' : activeFolder === 'templates' ? 'Email Templates' : 'My Sent Emails & Leave Requests History'}
                  className="font-bold text-gray-800"
                  delay={25}
                  duration={0.6}
                  style={{ fontSize: 18, fontWeight: 700, color: TEXT_MAIN, margin: 0 }}
                />
                {/* React Bits ShinyText */}
                <span style={{ background: '#e8f0fe', padding: '3px 10px', borderRadius: 20, border: '1px solid #c2e7ff', display: 'inline-flex' }}>
                  <ShinyText text="Google Mail Style" speed={3} style={{ fontSize: 11, fontWeight: 600, color: GMAIL_BLUE }} />
                </span>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                {activeFolder === 'leaves' ? 'All formal leave applications submitted to HR and management' : activeFolder === 'admin_audit' ? 'Official communications logged and accessible for Managing Director' : 'Dispatched messages with delivery verification and permanent logging'}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isMD && activeFolder === 'admin_audit' && trackingUsers.length > 0 && (
                <select
                  value={selectedEmployeeFilter}
                  onChange={e => {
                    setSelectedEmployeeFilter(e.target.value);
                    fetchEmailLogs(e.target.value, searchQuery);
                  }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${BORDER_LIGHT}`, fontSize: 12, fontWeight: 500, background: WHITE, color: TEXT_MAIN, outline: 'none' }}
                >
                  <option value="all">👥 All Staff ({trackingUsers.length})</option>
                  {trackingUsers.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.designation || 'Staff'})</option>
                  ))}
                </select>
              )}

              {activeFolder === 'templates' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: GMAIL_BLUE, color: WHITE, border: 'none', borderRadius: 8,
                    padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  + Create Template
                </button>
              )}

              <button
                onClick={() => setShowWebhookModal(true)}
                title="View incoming reply webhook instructions & payload schema for n8n"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 8,
                  padding: '7px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Webhook Setup
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Checkbox, Refresh, Filter Chips */}
          <div style={{ background: WHITE, padding: '8px 24px', borderBottom: `1px solid ${BORDER_LIGHT}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="checkbox" style={{ width: 16, height: 16, accentColor: GMAIL_BLUE, cursor: 'pointer' }} />
              <button
                onClick={() => fetchEmailLogs(selectedEmployeeFilter, searchQuery)}
                title="Refresh list"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, display: 'flex', alignItems: 'center' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
              <div style={{ width: 1, height: 18, background: BORDER_LIGHT }}></div>
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                Showing {displayedLogs.length} messages
              </span>
            </div>

            <div style={{ fontSize: 12, color: TEXT_MUTED }}>
              1–{displayedLogs.length} of {displayedLogs.length}
            </div>
          </div>

          {/* ── DETAIL READING PANE (When email is selected) ──────────── */}
          {selectedEmail ? (
            <div style={{ flex: 1, background: WHITE, padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Back button */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setSelectedEmail(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: GMAIL_BLUE, fontSize: 13, fontWeight: 600, padding: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Back to {activeFolder === 'leaves' ? 'Leave Requests' : 'Sent'}
                </button>
              </div>

              {/* Message Header */}
              <div style={{ borderBottom: `1px solid ${BORDER_LIGHT}`, paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: TEXT_MAIN, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedEmail.subject}
                  {selectedEmail.isLeaveRequest && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: ORANGE_LIGHT, color: ORANGE_PRIMARY, border: `1px solid ${ORANGE_BORDER}`, padding: '2px 8px', borderRadius: 4 }}>
                      Leave Application
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: GMAIL_BLUE, color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>
                      {(selectedEmail.senderName || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_MAIN }}>
                        {selectedEmail.senderName || 'Staff'} <span style={{ fontSize: 12, fontWeight: 400, color: TEXT_MUTED }}>&lt;{selectedEmail.fromEmail || selectedEmail.from}&gt;</span>
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                        to: <strong style={{ color: TEXT_MAIN }}>{selectedEmail.recipientEmail || selectedEmail.recipient}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                      {selectedEmail.createdAt ? new Date(selectedEmail.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('inline-reply-textarea');
                          if (el) {
                            el.focus();
                            el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', background: WHITE, border: `1px solid ${BORDER_LIGHT}`,
                          borderRadius: 14, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: GMAIL_BLUE
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                        Reply
                      </button>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 600,
                          color: selectedEmail.status === 'Failed' ? '#dc2626' : '#16a34a',
                          background: selectedEmail.status === 'Failed' ? '#fef2f2' : '#f0fdf4',
                          border: `1px solid ${selectedEmail.status === 'Failed' ? '#fecaca' : '#bbf7d0'}`,
                          padding: '2px 8px', borderRadius: 10, display: 'inline-block'
                        }}
                      >
                        {selectedEmail.status || 'Delivered'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* If Failed: Show n8n Webhook Failure Alert */}
              {selectedEmail.status === 'Failed' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 18px', marginBottom: 18, color: '#991b1b', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#b91c1c' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    n8n Webhook Dispatch Failed
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 500 }}>
                    {selectedEmail.errorMessage || 'Webhook execution encountered an error.'}
                  </div>
                  {/access token|token|gmail|credential/i.test(selectedEmail.errorMessage || '') && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fee2e2', borderRadius: 6, fontSize: 12, color: '#7f1d1d' }}>
                      💡 <strong>Resolution:</strong> The Gmail OAuth2 credential in n8n is disconnected or expired. Please re-authenticate your Google account in n8n.
                    </div>
                  )}
                </div>
              )}

              {/* Original Message Card */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: TEXT_MUTED }}>
                    {selectedEmail.direction === 'inbound' ? 'Initial Inbound Message' : 'Original Dispatched Message'}
                  </span>
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                    {selectedEmail.createdAt ? new Date(selectedEmail.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, color: TEXT_MAIN, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#fafbfc', padding: 20, borderRadius: 8, border: `1px solid ${BORDER_LIGHT}` }}>
                  {selectedEmail.body || '(No message content recorded)'}
                </div>
              </div>

              {/* ── REPLY STREAM: Notification Style Mail Cards ────────── */}
              <div style={{ marginTop: 8, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${BORDER_LIGHT}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_MAIN }}>
                      Conversation & Replies
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: selectedEmail.replies?.length > 0 ? '#7c3aed' : '#e2e8f0', color: selectedEmail.replies?.length > 0 ? WHITE : TEXT_MUTED, padding: '2px 8px', borderRadius: 12 }}>
                      {selectedEmail.replies?.length || 0}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#16a34a', fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                    Live Webhook Synced
                  </div>
                </div>

                {/* List of Replies */}
                {selectedEmail.replies && selectedEmail.replies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {selectedEmail.replies.map((reply, idx) => {
                      const isInbound = reply.direction === 'inbound' || reply.source === 'webhook' || reply.source === 'n8n_inbound';
                      const senderInitial = (reply.senderName || reply.senderEmail || 'U')[0].toUpperCase();

                      return (
                        <div
                          key={reply._id || idx}
                          style={{
                            borderRadius: 10,
                            border: `1px solid ${isInbound ? '#ddd6fe' : '#bfdbfe'}`,
                            borderLeft: `5px solid ${isInbound ? '#7c3aed' : '#1a73e8'}`,
                            background: isInbound ? '#faf7ff' : '#f8fbff',
                            padding: '14px 18px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                            transition: 'box-shadow 0.15s'
                          }}
                        >
                          {/* Notification Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  background: isInbound ? '#7c3aed' : '#1a73e8',
                                  color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13, fontWeight: 700
                                }}
                              >
                                {senderInitial}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_MAIN }}>
                                  {reply.senderName || reply.senderEmail}
                                  <span style={{ fontSize: 11.5, fontWeight: 400, color: TEXT_MUTED, marginLeft: 6 }}>
                                    &lt;{reply.senderEmail}&gt;
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                                  to: {reply.recipientEmail || selectedEmail.fromEmail || selectedEmail.recipientEmail}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 10.5, fontWeight: 700,
                                  background: isInbound ? '#f3e8ff' : '#dbeafe',
                                  color: isInbound ? '#6b21a8' : '#1e40af',
                                  border: `1px solid ${isInbound ? '#e9d5ff' : '#bfdbfe'}`,
                                  padding: '2px 8px', borderRadius: 12,
                                  display: 'flex', alignItems: 'center', gap: 4
                                }}
                              >
                                {isInbound ? (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                                    Incoming Reply (n8n Webhook)
                                  </>
                                ) : (
                                  <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                    Sent Reply
                                  </>
                                )}
                              </span>

                              <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                                {reply.receivedAt ? new Date(reply.receivedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                              </span>
                            </div>
                          </div>

                          {/* Reply Subject (if different or specified) */}
                          {reply.subject && reply.subject !== selectedEmail.subject && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>
                              Subject: {reply.subject}
                            </div>
                          )}

                          {/* Reply Message Body */}
                          <div
                            style={{
                              fontSize: 13,
                              color: '#1f2937',
                              lineHeight: 1.65,
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'inherit',
                              background: WHITE,
                              padding: '12px 16px',
                              borderRadius: 6,
                              border: `1px solid ${isInbound ? '#ede9fe' : '#e0e7ff'}`
                            }}
                          >
                            {reply.body}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '18px 20px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: `1px dashed ${BORDER_LIGHT}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      color: TEXT_MUTED,
                      fontSize: 12.5
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <div>
                      <div style={{ fontWeight: 600, color: TEXT_MAIN }}>No replies recorded yet</div>
                      <div>When the recipient replies via email or n8n webhook triggers an update, replies will appear right here automatically.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── INLINE REPLY COMPOSER ─────────────────────────────────── */}
              <div
                style={{
                  marginTop: 'auto',
                  background: '#f8fafd',
                  border: `1px solid ${BORDER_LIGHT}`,
                  borderRadius: 10,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: TEXT_MAIN }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GMAIL_BLUE} strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                    Quick Reply in Thread
                  </div>
                  <span style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                    To: <strong style={{ color: TEXT_MAIN }}>
                      {selectedEmail.direction === 'inbound'
                        ? selectedEmail.fromEmail
                        : (selectedEmail.recipientEmail || selectedEmail.fromEmail)}
                    </strong>
                  </span>
                </div>

                <textarea
                  id="inline-reply-textarea"
                  rows={3}
                  placeholder={`Write your reply to ${selectedEmail.direction === 'inbound' ? selectedEmail.fromEmail : (selectedEmail.recipientEmail || selectedEmail.fromEmail)}...`}
                  value={inlineReplyText}
                  onChange={e => setInlineReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1px solid ${BORDER_LIGHT}`,
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    background: WHITE,
                    boxSizing: 'border-box'
                  }}
                />

                {replyError && (
                  <div style={{ marginTop: 8, color: '#dc2626', fontSize: 12, fontWeight: 500 }}>
                    ⚠️ {replyError}
                  </div>
                )}

                {replySuccess && (
                  <div style={{ marginTop: 8, color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                    ✓ {replySuccess}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientEmail(
                        selectedEmail.direction === 'inbound'
                          ? selectedEmail.fromEmail
                          : (selectedEmail.recipientEmail || selectedEmail.fromEmail)
                      );
                      setSubject(selectedEmail.subject?.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject || ''}`);
                      setBody(inlineReplyText || '');
                      setComposeOpen(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: GMAIL_BLUE,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    Open in Full Composer
                  </button>

                  <button
                    type="button"
                    onClick={handleSendInlineReply}
                    disabled={replying || !inlineReplyText.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 20px',
                      background: !inlineReplyText.trim() ? '#93c5fd' : GMAIL_BLUE,
                      color: WHITE,
                      border: 'none',
                      borderRadius: 18,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: !inlineReplyText.trim() || replying ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    {replying ? (
                      'Sending...'
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : activeFolder === 'templates' ? (
            /* ── TEMPLATES LIST VIEW ─────────────────────────────────────── */
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {templates.map(t => (
                  <div
                    key={t.id}
                    style={{ background: WHITE, border: `1px solid ${BORDER_LIGHT}`, borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_MAIN }}>{t.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: GMAIL_BLUE, background: GMAIL_BLUE_LIGHT, padding: '2px 8px', borderRadius: 4 }}>
                          {t.category || 'Template'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: TEXT_MUTED, marginBottom: 10 }}>
                        Subject: {t.subject}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, maxHeight: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap', lineHeight: 1.5, background: '#f8f9fa', padding: 10, borderRadius: 6, fontFamily: 'monospace' }}>
                        {t.body}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BORDER_LIGHT}` }}>
                      <button
                        onClick={() => {
                          applyTemplate(t);
                          setComposeOpen(true);
                        }}
                        style={{ padding: '6px 14px', background: GMAIL_BLUE, color: WHITE, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Use in Compose
                      </button>
                      {t.isCustom && canDelete(user) && (
                        <button
                          onClick={e => handleDeleteTemplate(t.id, e)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── GMAIL ROWS LIST VIEW ─────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', background: WHITE }}>
              {loadingLogs ? (
                <div style={{ padding: 40, textAlign: 'center', color: TEXT_MUTED, fontSize: 13 }}>
                  Loading mail stream...
                </div>
              ) : displayedLogs.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: TEXT_MUTED }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dadce0" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>No messages found</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Click "+ Compose" to send an official email or leave application.</div>
                </div>
              ) : (
                <div>
                  {displayedLogs.map(log => {
                    const isStarred = starredEmails.has(log._id || log.id);
                    const isUnread = log.isRead === false;
                    const hasReplies = log.replies && log.replies.length > 0;
                    const isInbound = log.direction === 'inbound';

                    return (
                      <div
                        key={log._id || log.id}
                        onClick={() => handleSelectEmail(log)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '10px 20px',
                          borderBottom: `1px solid #f1f3f4`,
                          cursor: 'pointer',
                          background: isUnread ? '#f5f8ff' : WHITE,
                          fontWeight: isUnread ? 700 : 400,
                          transition: 'background 0.15s, box-shadow 0.15s',
                          borderLeft: isUnread ? `4px solid ${GMAIL_BLUE}` : '4px solid transparent'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = isUnread ? '#edf3fd' : ROW_HOVER;
                          e.currentTarget.style.boxShadow = 'inset 1px 0 0 #dadce0, inset -1px 0 0 #dadce0, 0 1px 2px rgba(60,64,67,0.15)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isUnread ? '#f5f8ff' : WHITE;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Checkbox & Star */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16 }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" style={{ width: 15, height: 15, accentColor: GMAIL_BLUE, cursor: 'pointer' }} />
                          <span
                            onClick={e => toggleStar(log._id || log.id, e)}
                            style={{ color: isStarred ? '#f4b400' : '#dadce0', fontSize: 16, cursor: 'pointer' }}
                          >
                            ★
                          </span>
                        </div>

                        {/* Recipient / Sender Name */}
                        <div style={{ width: 200, minWidth: 170, fontWeight: isUnread ? 700 : 600, fontSize: 13, color: TEXT_MAIN, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isInbound ? (
                            <>
                              <span style={{ fontSize: 9.5, fontWeight: 700, background: '#f3e8ff', color: '#7c3aed', padding: '1px 5px', borderRadius: 3, border: '1px solid #ddd6fe' }}>IN</span>
                              <span>{log.senderName || log.fromEmail}</span>
                            </>
                          ) : activeFolder === 'admin_audit' ? (
                            log.senderName || 'Staff'
                          ) : (
                            <span>To: {log.recipientEmail || log.recipient}</span>
                          )}
                        </div>

                        {/* Subject + Body Snippet */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, marginRight: 20 }}>
                          <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 600, color: TEXT_MAIN, whiteSpace: 'nowrap' }}>
                            {log.subject || '(No subject)'}
                          </span>
                          <span style={{ fontSize: 13, color: TEXT_MUTED, marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            — {log.body ? log.body.replace(/\n/g, ' ') : ''}
                          </span>
                        </div>

                        {/* Reply Count Badge */}
                        {hasReplies && (
                          <span
                            title={`${log.replies.length} reply message(s) in this thread`}
                            style={{
                              fontSize: 11, fontWeight: 700,
                              color: '#6b21a8', background: '#f5f3ff',
                              border: '1px solid #ddd6fe',
                              padding: '2px 8px', borderRadius: 12,
                              marginRight: 10, flexShrink: 0,
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            {log.replies.length}
                          </span>
                        )}

                        {/* Category Tag if leave request */}
                        {log.isLeaveRequest && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: ORANGE_PRIMARY, background: ORANGE_LIGHT, border: `1px solid ${ORANGE_BORDER}`, padding: '2px 8px', borderRadius: 4, marginRight: 10, flexShrink: 0 }}>
                            Leave
                          </span>
                        )}

                        {/* Status Pill */}
                        {log.status === 'Failed' ? (
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4, marginRight: 12, flexShrink: 0 }} title={log.errorMessage || 'Failed to dispatch'}>
                            Failed (n8n Error)
                          </span>
                        ) : (
                          <span style={{ fontSize: 10.5, fontWeight: 500, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 4, marginRight: 12, flexShrink: 0 }}>
                            Delivered
                          </span>
                        )}

                        {/* Date / Time */}
                        <div style={{ fontSize: 12, fontWeight: isUnread ? 700 : 500, color: isUnread ? TEXT_MAIN : TEXT_MUTED, whiteSpace: 'nowrap', textAlign: 'right', minWidth: 70 }}>
                          {log.createdAt ? formatGmailDate(log.createdAt) : 'Today'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. GMAIL FLOATING DOCKED COMPOSE WINDOW ──────────────────────── */}
      {composeOpen && (
        <div
          style={
            composeMaximized
              ? {
                  position: 'fixed', inset: 24, zIndex: 9999,
                  background: WHITE, borderRadius: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  border: `1px solid ${BORDER_LIGHT}`
                }
              : composeMinimized
              ? {
                  position: 'fixed', right: 24, bottom: 0, zIndex: 9999,
                  width: 280, height: 42,
                  background: '#202124', color: WHITE, borderRadius: '8px 8px 0 0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 14px', cursor: 'pointer'
                }
              : {
                  position: 'fixed', right: 24, bottom: 0, zIndex: 9999,
                  width: 580, height: 520, maxHeight: '82vh',
                  background: WHITE, borderRadius: '10px 10px 0 0',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  border: `1px solid ${BORDER_LIGHT}`
                }
          }
        >
          {/* Compose Title Bar */}
          <div
            onClick={() => { if (composeMinimized) setComposeMinimized(false); }}
            style={{
              background: '#f2f6fc', borderBottom: `1px solid ${BORDER_LIGHT}`,
              padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_MAIN }}>
              New Message — {selectedTemplateId === 'leave_template' ? 'Leave Application' : 'Email'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Minimize */}
              <button
                onClick={e => { e.stopPropagation(); setComposeMinimized(!composeMinimized); }}
                style={composeControlBtn}
                title="Minimize"
              >
                ─
              </button>
              {/* Maximize */}
              <button
                onClick={e => { e.stopPropagation(); setComposeMaximized(!composeMaximized); }}
                style={composeControlBtn}
                title="Maximize / Restore"
              >
                ⤢
              </button>
              {/* Close */}
              <button
                onClick={e => { e.stopPropagation(); setComposeOpen(false); }}
                style={composeControlBtn}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Compose Body Content (when not minimized) */}
          {!composeMinimized && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              {/* FROM FIELD: Editable Sender Email */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid #f1f3f4` }}>
                <span style={{ width: 50, fontSize: 12.5, color: TEXT_MUTED }}>From</span>
                <input
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  placeholder="Sender email"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: GMAIL_BLUE, fontWeight: 600 }}
                />
                <button
                  type="button"
                  onClick={() => setFromEmail(user?.email || 'user@aotms.com')}
                  style={{ fontSize: 11, background: '#f1f3f4', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', color: TEXT_MUTED }}
                >
                  My Email
                </button>
              </div>

              {/* TO FIELD: Editable Recipient Email */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: `1px solid #f1f3f4` }}>
                <span style={{ width: 50, fontSize: 12.5, color: TEXT_MUTED }}>To</span>
                <input
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="Customer email address (e.g. client@example.com)"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: TEXT_MAIN }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setRecipientEmail('hr@aotms.com')}
                    style={{ fontSize: 11, background: GMAIL_BLUE_LIGHT, color: GMAIL_BLUE, border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                  >
                    hr@aotms.com
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientEmail('ameen@aotms.com')}
                    style={{ fontSize: 11, background: ORANGE_LIGHT, color: ORANGE_PRIMARY, border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                  >
                    MD Ameen
                  </button>
                </div>
              </div>

              {/* SUBJECT FIELD: Clean borderless input */}
              <div style={{ padding: '8px 16px', borderBottom: `1px solid #f1f3f4` }}>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 500, color: TEXT_MAIN }}
                />
              </div>

              {/* TEMPLATE QUICK SELECTOR */}
              <div style={{ padding: '6px 16px', background: '#f8f9fa', borderBottom: `1px solid #f1f3f4`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: TEXT_MUTED }}>Template:</span>
                <select
                  value={selectedTemplateId}
                  onChange={e => {
                    const tmpl = templates.find(t => t.id === e.target.value);
                    if (tmpl) applyTemplate(tmpl);
                  }}
                  style={{ fontSize: 11.5, border: `1px solid ${BORDER_LIGHT}`, borderRadius: 4, padding: '2px 8px', background: WHITE, color: TEXT_MAIN, outline: 'none' }}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* MESSAGE TEXTAREA */}
              <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write your email body or leave application details..."
                  style={{
                    flex: 1, width: '100%', border: 'none', outline: 'none',
                    resize: 'none', fontSize: 13, lineHeight: 1.6,
                    fontFamily: 'Roboto, monospace', color: TEXT_MAIN
                  }}
                />
              </div>

              {/* Banners if error / success */}
              {sentError && (
                <div style={{ background: '#fef2f2', borderTop: '1px solid #fecaca', borderBottom: '1px solid #fecaca', padding: '12px 16px', fontSize: 12.5, color: '#991b1b' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#b91c1c' }}>n8n Webhook Dispatch Error Detected:</div>
                      <div style={{ marginTop: 2, fontWeight: 500 }}>{sentError}</div>
                      {/not registered|404|inactive/i.test(sentError) && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: '#fee2e2', borderRadius: 4, fontSize: 11.5, color: '#7f1d1d' }}>
                          💡 <strong>Action Required:</strong> The n8n workflow is currently <strong>Inactive (OFF)</strong>. Whenever you edit or paste a workflow in n8n, it switches to Inactive. Please open n8n and toggle the <strong>Active switch to ON</strong> (or click <strong>Publish</strong>) in the top-right corner!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {sentSuccess && (
                <div style={{ background: '#f0fdf4', borderTop: '1px solid #bbf7d0', padding: '10px 16px', fontSize: 12.5, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✓</span> {sentSuccess}
                </div>
              )}

              {/* BOTTOM ACTION TOOLBAR */}
              <div style={{ padding: '12px 16px', borderTop: `1px solid #f1f3f4`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: WHITE }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    disabled={sending}
                    onClick={handleSendEmail}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: sending ? '#93c5fd' : GMAIL_BLUE,
                      color: WHITE, border: 'none', borderRadius: 20,
                      padding: '8px 24px', fontSize: 13, fontWeight: 600,
                      cursor: sending ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                    onMouseEnter={e => { if (!sending) e.currentTarget.style.background = GMAIL_BLUE_HOVER; }}
                    onMouseLeave={e => { if (!sending) e.currentTarget.style.background = GMAIL_BLUE; }}
                  >
                    <span>{sending ? 'Sending...' : 'Send'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>

                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                    Recipient: {recipientEmail}
                  </span>
                </div>

                {/* Discard / Trash Button */}
                <button
                  onClick={() => setComposeOpen(false)}
                  title="Discard draft"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED, padding: 6, borderRadius: '50%' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f3f4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. CREATE TEMPLATE MODAL ─────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,33,36,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: WHITE, borderRadius: 12, width: 480, maxWidth: '92%', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT_MAIN }}>Create Email Template</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED }}>✕</button>
            </div>

            {createError && <div style={{ background: '#fef2f2', padding: '8px 12px', borderRadius: 6, color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{createError}</div>}

            <form onSubmit={handleCreateTemplate}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Template Name</label>
                <input
                  required
                  placeholder="e.g., Casual Leave, Half-Day Request"
                  value={newTmplName}
                  onChange={e => setNewTmplName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Subject Line</label>
                <input
                  placeholder="e.g., Leave Application - {{employee_name}}"
                  value={newTmplSubject}
                  onChange={e => setNewTmplSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 6, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Message Body</label>
                <textarea
                  required
                  rows={6}
                  value={newTmplBody}
                  onChange={e => setNewTmplBody(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 6, fontSize: 12.5, outline: 'none', fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
                  Tags: {'{{employee_name}}'}, {'{{designation}}'}, {'{{email}}'}, {'{{phone}}'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', background: 'none', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creatingTmpl} style={{ padding: '8px 18px', background: GMAIL_BLUE, color: WHITE, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {creatingTmpl ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. INCOMING WEBHOOK SETUP MODAL (FOR N8N & AUTOMATIONS) ────── */}
      {showWebhookModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,33,36,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 16 }}>
          <div style={{ background: WHITE, borderRadius: 14, width: 620, maxWidth: '96%', maxHeight: '90vh', overflowY: 'auto', padding: 26, boxShadow: '0 12px 36px rgba(0,0,0,0.25)', border: `1px solid ${BORDER_LIGHT}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_MAIN }}>Incoming Reply Webhook for n8n</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>Real-time message synchronization with automated thread linking</div>
                </div>
              </div>
              <button
                onClick={() => setShowWebhookModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: TEXT_MUTED, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Notification explanation banner */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
              ⚡ <strong>How it works:</strong> Whenever an external recipient replies to your email, n8n (or any email trigger node) can send an HTTP POST request to this endpoint. The CRM automatically matches the thread by subject and sender, appending the incoming reply directly into the conversation stream in <strong>message notification style</strong>.
            </div>

            {/* Endpoint block */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_MAIN, display: 'block', marginBottom: 6 }}>
                Webhook Endpoint URL
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#22c55e', color: WHITE, padding: '6px 10px', borderRadius: 6 }}>
                  POST
                </span>
                <input
                  readOnly
                  value={`${window.location.origin}/api/email/inbound-reply`}
                  style={{ flex: 1, padding: '8px 12px', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 6, fontSize: 12.5, fontFamily: 'monospace', background: '#f8f9fa', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/email/inbound-reply`);
                    alert('Endpoint URL copied to clipboard!');
                  }}
                  style={{ padding: '8px 14px', background: GMAIL_BLUE, color: WHITE, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Copy URL
                </button>
              </div>
            </div>

            {/* Payload Schema for n8n */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: TEXT_MAIN }}>
                  Expected JSON Payload (n8n HTTP Request / Webhook Node)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = JSON.stringify({
                      from: "client@example.com",
                      to: "support@company.com",
                      subject: "Re: Your Email Subject",
                      body: "Hello, this is my reply to your email.",
                      senderName: "Client Name"
                    }, null, 2);
                    navigator.clipboard.writeText(sample);
                    alert('Sample JSON copied to clipboard!');
                  }}
                  style={{ background: 'none', border: 'none', color: GMAIL_BLUE, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  Copy Sample JSON
                </button>
              </div>
              <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '14px 16px', borderRadius: 8, fontSize: 12, lineHeight: 1.5, overflowX: 'auto', fontFamily: 'monospace', margin: 0 }}>
{`{
  "from": "client@example.com",
  "to": "support@company.com",
  "subject": "Re: Project Discussion",
  "body": "Thank you for the message. I agree with the proposal and would like to move forward.",
  "senderName": "Client Name"
}`}
              </pre>
            </div>

            {/* Field breakdown */}
            <div style={{ background: '#fcfcfc', border: `1px solid ${BORDER_LIGHT}`, borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: TEXT_MAIN, marginBottom: 8 }}>Field Reference:</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                <li><strong style={{ color: TEXT_MAIN }}>from</strong> (string, required): The email address of the person replying.</li>
                <li><strong style={{ color: TEXT_MAIN }}>to</strong> (string, optional): Your email or CRM recipient address.</li>
                <li><strong style={{ color: TEXT_MAIN }}>subject</strong> (string, required): The email subject (e.g. <code>Re: Project Discussion</code>).</li>
                <li><strong style={{ color: TEXT_MAIN }}>body</strong> (string, required): The body of the reply message.</li>
                <li><strong style={{ color: TEXT_MAIN }}>senderName</strong> (string, optional): Display name of the sender.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowWebhookModal(false)}
                style={{ padding: '8px 20px', background: GMAIL_BLUE, color: WHITE, border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function getSidebarItemStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 36,
    borderRadius: '0 18px 18px 0',
    cursor: 'pointer',
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#001d35' : '#444746',
    background: isActive ? SIDEBAR_ACTIVE : 'transparent',
    transition: 'background 0.15s',
  };
}

const composeControlBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: TEXT_MUTED,
  fontSize: 14,
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

function formatGmailDate(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}
