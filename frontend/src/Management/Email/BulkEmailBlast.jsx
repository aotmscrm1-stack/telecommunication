import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { canAccessEmailBlast } from '../../utils/permissions';
import { emailBlastAPI, leadsAPI } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Mail, Send, Image as ImageIcon, Trash2, Edit3, Plus, Check,
  Search, Filter, CheckSquare, Square, RefreshCw, AlertCircle,
  Upload, ExternalLink, ShieldAlert, Sparkles, CheckCircle2,
  Users, ChevronDown, Eye, X, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function BulkEmailBlast() {
  const { user } = useAuth();
  const isAuthorized = canAccessEmailBlast(user);

  // Leads & Contacts state
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [directoryTab, setDirectoryTab] = useState('all'); // 'all' | 'leads' | 'contacts'
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateImageUrl, setTemplateImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Broadcast dispatch state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState({ type: '', message: '' });

  const fileInputRef = useRef(null);

  // Show feedback toast helper
  const notify = (type, message) => {
    setFeedbackToast({ type, message });
    setTimeout(() => setFeedbackToast({ type: '', message: '' }), 5000);
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await emailBlastAPI.getTemplates();
      const tmpls = res.data?.templates || [];
      setTemplates(tmpls);
      if (tmpls.length > 0 && !selectedTemplateId) {
        loadTemplateIntoForm(tmpls[0]);
      }
    } catch (err) {
      console.error('Failed to load email templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch All Leads & MongoDB Contacts
  const fetchLeads = async () => {
    try {
      setLoadingLeads(true);
      const token = localStorage.getItem('aotms_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const cleanBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const apiEndpoint = cleanBase ? `${cleanBase}/api/contacts` : '/api/contacts';

      const [leadsRes, contactsRes] = await Promise.all([
        leadsAPI.getAll({ limit: 2000 }).catch(() => null),
        fetch(apiEndpoint, { headers: authHeaders }).then(r => r.json()).catch(() => null)
      ]);

      const rawLeads = leadsRes?.data?.leads || leadsRes?.data || [];
      setLeads(rawLeads);

      if (contactsRes && contactsRes.success && Array.isArray(contactsRes.contacts)) {
        setContacts(contactsRes.contacts);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error('Failed to load leads & contacts:', err);
      notify('error', 'Could not load directory data.');
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchTemplates();
      fetchLeads();
    }
  }, [isAuthorized]);

  // Load a selected template into the editor
  const loadTemplateIntoForm = (tmpl) => {
    if (!tmpl) return;
    setSelectedTemplateId(tmpl.id || tmpl._id || '');
    setTemplateName(tmpl.name || tmpl.shortcut || '');
    setTemplateSubject(tmpl.subject || '');
    setTemplateBody(tmpl.body || tmpl.message || '');
    setTemplateImageUrl(tmpl.imageUrl || '');
    setIsEditingTemplate(false);
  };

  // Handle template selection change
  const handleSelectTemplate = (id) => {
    const found = templates.find(t => (t.id || t._id) === id);
    if (found) {
      loadTemplateIntoForm(found);
    } else {
      setSelectedTemplateId('');
      setTemplateName('');
      setTemplateSubject('');
      setTemplateBody('');
      setTemplateImageUrl('');
      setIsEditingTemplate(true);
    }
  };

  // Reset for creating new template
  const handleCreateNewTemplate = () => {
    setSelectedTemplateId('');
    setTemplateName('New Email Broadcast Template');
    setTemplateSubject('Special Announcement from AOTMS');
    setTemplateBody('Dear {{name}},\n\nWe are excited to share an exclusive update with you.\n\nBest regards,\nAOTMS Team');
    setTemplateImageUrl('');
    setIsEditingTemplate(true);
  };

  // Upload image to Cloudinary
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('error', 'Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify('error', 'Image size must be less than 8MB.');
      return;
    }

    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await emailBlastAPI.uploadImage(base64Data, 'email_broadcast_images');
          if (res.data?.url) {
            setTemplateImageUrl(res.data.url);
            notify('success', 'Image successfully uploaded to Cloudinary!');
          } else {
            notify('error', 'Failed to retrieve Cloudinary URL.');
          }
        } catch (uploadErr) {
          notify('error', uploadErr.response?.data?.message || 'Cloudinary upload failed.');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingImage(false);
      notify('error', 'Failed to process image file.');
    }
  };

  // Save or update template
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) {
      notify('error', 'Template Name and Content Body are required.');
      return;
    }

    setSavingTemplate(true);
    try {
      const payload = {
        name: templateName.trim(),
        subject: templateSubject.trim() || templateName.trim(),
        body: templateBody.trim(),
        imageUrl: templateImageUrl.trim()
      };

      if (selectedTemplateId && !selectedTemplateId.includes('default') && !selectedTemplateId.includes('general')) {
        await emailBlastAPI.updateTemplate(selectedTemplateId, payload);
        notify('success', 'Template updated successfully!');
      } else {
        const res = await emailBlastAPI.createTemplate(payload);
        notify('success', 'New template created successfully!');
        if (res.data?.template?.id) {
          setSelectedTemplateId(res.data.template.id);
        }
      }
      setIsEditingTemplate(false);
      fetchTemplates();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Delete current template
  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId || selectedTemplateId.includes('default') || selectedTemplateId.includes('general')) {
      notify('error', 'Cannot delete default template.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) return;

    try {
      await emailBlastAPI.deleteTemplate(selectedTemplateId);
      notify('success', 'Template deleted successfully.');
      setSelectedTemplateId('');
      fetchTemplates();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Failed to delete template.');
    }
  };

  // Unified Audience (Leads + Contacts)
  const allAudience = useMemo(() => {
    const list = [];

    if (directoryTab === 'all' || directoryTab === 'leads') {
      leads.forEach(l => {
        list.push({
          _id: l._id || l.id,
          name: l.name || 'Valued Lead',
          email: l.email || '',
          phone: l.phone || l.mobile || '',
          company: l.company || '',
          status: l.status || 'Fresh',
          identity: l.identity || 'Lead',
          sourceType: 'lead'
        });
      });
    }

    if (directoryTab === 'all' || directoryTab === 'contacts') {
      contacts.forEach(c => {
        list.push({
          _id: c._id || c.id || `c_${c.phone}`,
          name: c.name || 'Contact',
          email: c.email || '',
          phone: c.phone || '',
          company: c.identity || 'SAP FICO',
          status: c.segment || 'Contact',
          identity: (c.identity && c.identity !== 'General') ? c.identity : 'SAP FICO',
          sourceType: 'contact'
        });
      });
    }

    return list;
  }, [leads, contacts, directoryTab]);

  // Filter audience list
  const filteredLeads = useMemo(() => {
    return allAudience.filter(item => {
      const matchSearch =
        !leadSearch.trim() ||
        item.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        item.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        item.phone?.includes(leadSearch) ||
        item.company?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        item.identity?.toLowerCase().includes(leadSearch.toLowerCase());

      const matchStatus =
        statusFilter === 'All' ||
        String(item.status || '').toLowerCase() === statusFilter.toLowerCase() ||
        String(item.identity || '').toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [allAudience, leadSearch, statusFilter]);

  // Filtered audience with valid emails
  const filteredLeadsWithEmail = useMemo(() => {
    return filteredLeads.filter(l => l.email && l.email.includes('@') && l.email.includes('.'));
  }, [filteredLeads]);

  // ── Pagination State for Directory (20 items per page) ──
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 on search or status filter modification
  useEffect(() => {
    setCurrentPage(1);
  }, [leadSearch, statusFilter, directoryTab]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  // Paginated slice for current page
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, safeCurrentPage, PAGE_SIZE]);

  // Paginated audience on current page with valid email
  const paginatedLeadsWithEmail = useMemo(() => {
    return paginatedLeads.filter(l => l.email && l.email.includes('@') && l.email.includes('.'));
  }, [paginatedLeads]);

  // Selection handlers
  const handleToggleLead = (leadId, hasEmail) => {
    if (!hasEmail) return;
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const handleToggleCurrentPage = () => {
    const allPageSelected = paginatedLeadsWithEmail.length > 0 && paginatedLeadsWithEmail.every(l => selectedLeadIds.has(l._id));
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedLeadsWithEmail.forEach(l => next.delete(l._id));
      } else {
        paginatedLeadsWithEmail.forEach(l => next.add(l._id));
      }
      return next;
    });
  };

  const handleSelectPage = () => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      paginatedLeadsWithEmail.forEach(l => next.add(l._id));
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allValidIds = filteredLeadsWithEmail.map(l => l._id);
    setSelectedLeadIds(new Set(allValidIds));
  };

  const handleClearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  // Calculate actual recipient emails selected
  const selectedRecipientsList = useMemo(() => {
    const list = [];
    allAudience.forEach(item => {
      if (selectedLeadIds.has(item._id) && item.email && item.email.includes('@')) {
        list.push({
          id: item._id,
          name: item.name || 'Valued Contact',
          email: item.email.trim().toLowerCase(),
          phone: item.phone || '',
          sourceType: item.sourceType
        });
      }
    });
    // Deduplicate emails
    const unique = [];
    const seen = new Set();
    list.forEach(item => {
      if (!seen.has(item.email)) {
        seen.add(item.email);
        unique.push(item);
      }
    });
    return unique;
  }, [allAudience, selectedLeadIds]);

  // Dispatch Bulk Email Broadcast to n8n Webhook
  const handleConfirmDispatch = async () => {
    if (selectedRecipientsList.length === 0) {
      notify('error', 'Please select at least one recipient lead with a valid email.');
      return;
    }
    if (!templateSubject.trim() || !templateBody.trim()) {
      notify('error', 'Subject and Email message body are required.');
      return;
    }

    setIsDispatching(true);
    try {
      const payload = {
        recipients: selectedRecipientsList.map(r => r.email),
        subject: templateSubject.trim(),
        content: templateBody.trim(),
        imageUrl: templateImageUrl.trim() || undefined,
        templateId: selectedTemplateId || undefined
      };

      const res = await emailBlastAPI.triggerBulkBlast(payload);
      setDispatchResult({
        success: true,
        count: res.data?.totalRecipients || selectedRecipientsList.length,
        webhookUrl: res.data?.webhookUrl || 'https://aotms.app.n8n.cloud/webhook/AI-Mail',
        message: res.data?.message || 'Dispatched successfully via n8n workflow!'
      });
      notify('success', `Bulk Email Broadcast dispatched to ${selectedRecipientsList.length} recipients!`);
    } catch (err) {
      console.error('Dispatch error:', err);
      notify('error', err.response?.data?.message || 'Failed to dispatch broadcast to n8n.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Permission Guard View if unauthorized
  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '75vh', padding: 24, textAlign: 'center', background: '#fafbfc'
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
        }}>
          <ShieldAlert size={36} color="#dc2626" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Access Restricted Module
        </h2>
        <p style={{ maxWidth: 500, fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
          The Bulk Email Broadcast engine is protected and strictly restricted to <strong>CTO</strong>, <strong>HR</strong>, and <strong>Managing Director</strong> designations.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, color: '#475569'
        }}>
          Current user role: <strong>{user?.designation || user?.role || 'Staff'}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-email-outer" style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', maxHeight: 'calc(100vh - 84px)', minHeight: 0,
      background: '#f8fafc', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 1024px) {
          .bulk-email-main-split { flex-direction: column !important; overflow-y: auto !important; }
          .bulk-email-left-pane { width: 100% !important; max-width: 100% !important; min-width: 0 !important; border-right: none !important; border-bottom: 1px solid #e2e8f0 !important; }
          .bulk-email-right-pane { width: 100% !important; min-width: 0 !important; }
        }
        @media (max-width: 640px) {
          .bulk-email-container { padding: 4px 6px !important; }
          .bulk-email-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; padding: 12px 14px !important; }
        }
      `}</style>

      {/* Responsive Wrapper Container with max-width */}
      <div className="bulk-email-container" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1440, margin: '0 auto', padding: '6px 12px', height: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', overflow: 'hidden', height: '100%' }}>

          {/* ── TOP HEADER BAR ── */}
          <div className="bulk-email-header" style={{
            background: '#ffffff', borderBottom: '1px solid #e2e8f0',
            padding: '12px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb',
                flexShrink: 0
              }}>
                <Mail size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <h1 style={{ margin: 0, fontSize: 16.5, fontWeight: 600, color: '#0f172a' }}>
                    Bulk Email Broadcast
                  </h1>
                  <span style={{
                    background: '#fff7ed', color: '#ea580c', fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 12, border: '1px solid #fed7aa',
                    display: 'inline-flex', alignItems: 'center', gap: 4
                  }}>
                    <Sparkles size={11} /> High-Speed Engine
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                  Multi-channel Email Dispatcher • Authorized for CTO, HR, MD
                </p>
              </div>
            </div>

            {/* Action Header Stats & Launch Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: 20,
                fontSize: 12, color: '#1d4ed8', fontWeight: 600
              }}>
                Selected: <span style={{ color: '#2563eb', fontWeight: 600 }}>{selectedRecipientsList.length}</span> recipients
              </div>

              <button
                onClick={() => {
                  if (selectedRecipientsList.length === 0) {
                    notify('error', 'Please select at least 1 lead recipient with an email.');
                    return;
                  }
                  if (!templateSubject.trim() || !templateBody.trim()) {
                    notify('error', 'Subject and template content cannot be empty.');
                    return;
                  }
                  setShowConfirmModal(true);
                }}
                disabled={selectedRecipientsList.length === 0}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: selectedRecipientsList.length > 0 ? '#2563eb' : '#cbd5e1',
                  color: '#ffffff', border: 'none', cursor: selectedRecipientsList.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: selectedRecipientsList.length > 0 ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <Send size={14} /> Launch Email Broadcast
              </button>
            </div>
          </div>

      {/* Toast Notification */}
      {feedbackToast.message && (
        <div style={{
          position: 'fixed', top: 76, right: 24, zIndex: 1000,
          background: feedbackToast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff', padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {feedbackToast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {feedbackToast.message}
        </div>
      )}

      {/* ── 2-COLUMN MAIN CONTENT (LEFT: TEMPLATE CRUD, RIGHT: ALL LEADS) ── */}
      <div className="bulk-email-main-split" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* ═══════════ LEFT PANE: TEMPLATE CRUD & CLOUDINARY IMAGES (45%) ═══════════ */}
        <div className="bulk-email-left-pane" style={{
          width: '45%', minWidth: 380, maxWidth: 600, borderRight: '1px solid #e2e8f0',
          background: '#ffffff', display: 'flex', flexDirection: 'column', height: '100%',
          overflowY: 'auto', padding: '18px 22px'
        }}>
          {/* Template Header & Selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={18} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#0f172a' }}>
                  Template Management
                </h3>
              </div>
              <button
                onClick={handleCreateNewTemplate}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> New Template
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                  fontSize: 13, color: '#1e293b', background: '#f8fafc', outline: 'none'
                }}
              >
                <option value="">-- Choose Existing Template --</option>
                {templates.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>
                    {t.name || t.shortcut} {t.isCustom ? '(Custom)' : '(Default)'}
                  </option>
                ))}
              </select>

              {selectedTemplateId && (
                <button
                  onClick={handleDeleteTemplate}
                  title="Delete this template"
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca',
                    background: '#fff1f2', color: '#ef4444', cursor: 'pointer'
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Template Editor Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {/* Template Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Seasonal Tech Offer"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                  fontSize: 13, outline: 'none', background: '#ffffff', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Email Subject Line */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  Email Subject Line
                </label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['{{name}}', '{{company}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTemplateSubject(prev => `${prev} ${tag}`)}
                      style={{
                        padding: '2px 8px', fontSize: 11, borderRadius: 5, background: '#eff6ff',
                        border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="Subject of the email broadcast"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                  fontSize: 13.5, outline: 'none', background: '#ffffff', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Email Body / Content */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  Message Content / Text
                </label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['{{name}}', '{{email}}', '{{phone}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTemplateBody(prev => `${prev} ${tag}`)}
                      style={{
                        padding: '2px 8px', fontSize: 11, borderRadius: 5, background: '#eff6ff',
                        border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder="Write your email announcement or newsletter content here..."
                rows={9}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                  fontSize: 13.5, lineHeight: 1.5, outline: 'none', background: '#ffffff',
                  boxSizing: 'border-box', resize: 'vertical', minHeight: 140
                }}
              />
            </div>

            {/* ── CLOUDINARY IMAGE STORAGE UPLOADER ── */}
            <div style={{
              border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: 14,
              background: '#f8fafc', marginTop: 4
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={16} color="#f97316" />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                    Cloudinary Image Asset
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Stores permanently on Cloudinary CDN
                </span>
              </div>

              {templateImageUrl ? (
                <div style={{
                  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: 10, display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <img
                    src={templateImageUrl}
                    alt="Template banner"
                    style={{
                      width: 60, height: 60, objectFit: 'cover', borderRadius: 6,
                      border: '1px solid #cbd5e1', flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> Stored in Cloudinary
                    </div>
                    <a
                      href={templateImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block', fontSize: 11, color: '#2563eb', textDecoration: 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2
                      }}
                    >
                      {templateImageUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => setTemplateImageUrl('')}
                    title="Remove Image"
                    style={{
                      padding: 6, borderRadius: 6, border: 'none', background: '#fee2e2',
                      color: '#ef4444', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 8,
                      border: '1px solid #fed7aa', background: '#fff7ed', color: '#ea580c',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    {uploadingImage ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Uploading to Cloudinary...
                      </>
                    ) : (
                      <>
                        <Upload size={15} /> Upload Banner Image (Cloudinary)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Template Save Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: '#2563eb', color: '#ffffff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
                }}
              >
                {savingTemplate ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Save / Update Template
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT PANE: ALL LEADS WITH SELECTION & PAGINATION (55%) ═══════════ */}
        <div className="bulk-email-right-pane" style={{
          flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
          overflow: 'hidden', background: '#f8fafc'
        }}>
          {/* Leads Top Filters & Search */}
          <div style={{
            padding: '14px 18px 10px', background: '#ffffff', borderBottom: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={18} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#0f172a' }}>
                    All Leads & Contacts Directory
                  </h3>
                </div>

                {/* Audience Filter Tabs */}
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 2, borderRadius: 8, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setDirectoryTab('all')}
                    style={{
                      padding: '3px 9px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                      cursor: 'pointer', background: directoryTab === 'all' ? '#ffffff' : 'transparent',
                      color: directoryTab === 'all' ? '#1d4ed8' : '#64748b',
                      boxShadow: directoryTab === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    👥 All ({leads.length + contacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryTab('leads')}
                    style={{
                      padding: '3px 9px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                      cursor: 'pointer', background: directoryTab === 'leads' ? '#ffffff' : 'transparent',
                      color: directoryTab === 'leads' ? '#1d4ed8' : '#64748b',
                      boxShadow: directoryTab === 'leads' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    🎯 Leads ({leads.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectoryTab('contacts')}
                    style={{
                      padding: '3px 9px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6,
                      cursor: 'pointer', background: directoryTab === 'contacts' ? '#ffffff' : 'transparent',
                      color: directoryTab === 'contacts' ? '#ea580c' : '#64748b',
                      boxShadow: directoryTab === 'contacts' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    📑 Contacts ({contacts.length})
                  </button>
                </div>
              </div>

              {/* Selection Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleSelectPage}
                  title="Select reachable leads on the current page"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <CheckSquare size={13} /> Select Page ({paginatedLeadsWithEmail.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  title="Select all reachable leads matching filter"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <Check size={13} /> Select All ({filteredLeadsWithEmail.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  title="Clear all selections"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  <Square size={13} /> Deselect All
                </button>
              </div>
            </div>

            {/* Search and Status Dropdown */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search leads by name, email, or phone..."
                  style={{
                    width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: 13, outline: 'none',
                    background: '#f8fafc', boxSizing: 'border-box'
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1',
                  fontSize: 13, color: '#334155', background: '#f8fafc', outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Stages</option>
                <option value="Fresh">Fresh</option>
                <option value="Connected">Connected</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Demo Done">Demo Done</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          {/* ── PAGINATION CONTROLS BAR: PREVIOUS 1/20 NEXT ── */}
          <div style={{
            padding: '7px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 8, fontSize: 12, color: '#475569', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>
                Showing <strong style={{ color: '#0f172a', fontWeight: 600 }}>{filteredLeads.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1} - {Math.min(safeCurrentPage * PAGE_SIZE, filteredLeads.length)}</strong> of <strong style={{ color: '#0f172a', fontWeight: 600 }}>{filteredLeads.length}</strong>
              </span>
              {selectedRecipientsList.length > 0 && (
                <span style={{
                  background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
                }}>
                  {selectedRecipientsList.length} selected
                </span>
              )}
            </div>

            {/* Previous 1/20 Next Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage <= 1 ? '#94a3b8' : '#2563eb',
                  border: safeCurrentPage <= 1 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                  cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                  boxShadow: safeCurrentPage <= 1 ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s'
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '4px 10px', minWidth: 62, borderRadius: 6,
                background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.3px', textAlign: 'center'
              }}>
                {safeCurrentPage} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                  color: safeCurrentPage >= totalPages ? '#94a3b8' : '#2563eb',
                  border: safeCurrentPage >= totalPages ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                  cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                  boxShadow: safeCurrentPage >= totalPages ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s'
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* ── LEADS TABLE LIST (INSIDE SCROLLING CONTAINER) ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 14px' }}>
            {loadingLeads ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: '#64748b' }}>
                <RefreshCw size={20} className="animate-spin" />
                <span style={{ marginLeft: 8, fontSize: 13 }}>Loading leads database...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                No leads found matching your search criteria.
              </div>
            ) : (
              <div style={{
                background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0',
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
                      <th style={{ width: 44, padding: '10px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={paginatedLeadsWithEmail.length > 0 && paginatedLeadsWithEmail.every(l => selectedLeadIds.has(l._id))}
                          onChange={handleToggleCurrentPage}
                          title="Select / Deselect all reachable on this page"
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Lead Name</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email Address</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Phone</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Stage / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => {
                      const hasEmail = Boolean(lead.email && lead.email.includes('@'));
                      const isSelected = selectedLeadIds.has(lead._id);

                      return (
                        <tr
                          key={lead._id}
                          onClick={() => handleToggleLead(lead._id, hasEmail)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isSelected ? '#eff6ff' : (hasEmail ? '#ffffff' : '#fcfcfc'),
                            cursor: hasEmail ? 'pointer' : 'not-allowed',
                            transition: 'background 0.1s'
                          }}
                        >
                          <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              disabled={!hasEmail}
                              checked={isSelected}
                              onChange={() => handleToggleLead(lead._id, hasEmail)}
                              style={{ cursor: hasEmail ? 'pointer' : 'not-allowed' }}
                            />
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: hasEmail ? '#0f172a' : '#94a3b8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: isSelected ? '#2563eb' : (lead.sourceType === 'contact' ? '#f97316' : '#64748b'),
                                color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700
                              }}>
                                {(lead.name || 'L').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>{lead.name || 'Unnamed Lead'}</span>
                                  {lead.sourceType === 'contact' && (
                                    <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', padding: '1px 5px', borderRadius: 4 }}>
                                      Contact
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {hasEmail ? (
                              <span style={{ color: '#2563eb', fontWeight: 500 }}>
                                {lead.email}
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: 12 }}>
                                No email registered
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {lead.phone || '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {lead.sourceType === 'contact' ? (
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 12 }}>
                                🏷️ {lead.identity || 'SAP FICO'}
                              </span>
                            ) : (
                              <StatusBadge status={lead.status || 'Fresh'} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── BOTTOM FOOTER PAGINATION BAR (STICKY AT BOTTOM OF RIGHT PANE) ── */}
          {filteredLeads.length > PAGE_SIZE && (
            <div style={{
              padding: '8px 18px', background: '#ffffff', borderTop: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: '#64748b', flexShrink: 0
            }}>
              <span>
                Page <strong style={{ color: '#0f172a' }}>{safeCurrentPage}</strong> of <strong style={{ color: '#0f172a' }}>{totalPages}</strong> ({filteredLeads.length} total leads)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                    background: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                    color: safeCurrentPage <= 1 ? '#94a3b8' : '#2563eb',
                    border: safeCurrentPage <= 1 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                    cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={13} /> Previous
                </button>
                <span style={{ fontWeight: 600, color: '#1d4ed8', padding: '0 4px' }}>
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                    background: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                    color: safeCurrentPage >= totalPages ? '#94a3b8' : '#2563eb',
                    border: safeCurrentPage >= totalPages ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                    cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRMATION MODAL BEFORE DISPATCHING TO N8N ── */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 540,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'scaleUp 0.15s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={18} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Confirm Bulk Email Broadcast
                </h4>
              </div>
              <button
                onClick={() => { setShowConfirmModal(false); setDispatchResult(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20 }}>
              {dispatchResult ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#dcfce7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
                  }}>
                    <CheckCircle2 size={32} color="#16a34a" />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                    Broadcast Dispatched to n8n!
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#475569' }}>
                    Successfully queued <strong>{dispatchResult.count} recipients</strong>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                    padding: '12px 14px', fontSize: 13, color: '#1e40af'
                  }}>
                    You are about to launch a broadcast to <strong>{selectedRecipientsList.length} recipients</strong>.
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Subject Line
                    </label>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                      {templateSubject}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Message Preview
                    </label>
                    <div style={{
                      background: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0',
                      fontSize: 12.5, color: '#334155', maxHeight: 90, overflowY: 'auto', whiteSpace: 'pre-line'
                    }}>
                      {templateBody}
                    </div>
                  </div>

                  {templateImageUrl && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Attached Cloudinary Banner
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <img
                          src={templateImageUrl}
                          alt="Banner"
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        />
                        <span style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>
                          {templateImageUrl}
                        </span>
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    Target n8n Webhook: <code>https://aotms.app.n8n.cloud/webhook/AI-Mail</code>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: 10
            }}>
              {dispatchResult ? (
                <button
                  onClick={() => { setShowConfirmModal(false); setDispatchResult(null); }}
                  style={{
                    padding: '8px 18px', borderRadius: 8, background: '#0f172a',
                    color: '#ffffff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    disabled={isDispatching}
                    style={{
                      padding: '8px 16px', borderRadius: 8, background: '#ffffff',
                      color: '#475569', border: '1px solid #cbd5e1', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDispatch}
                    disabled={isDispatching}
                    style={{
                      padding: '8px 20px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff', border: 'none', fontSize: 13, fontWeight: 600,
                      cursor: isDispatching ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {isDispatching ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Dispatching...
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Confirm & Dispatch
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
