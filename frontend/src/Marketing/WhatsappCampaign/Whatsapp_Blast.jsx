import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  CheckSquare, 
  Square, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  BookUser, 
  Target, 
  X
} from 'lucide-react';
import { IoLogoWhatsapp as WhatsApp } from 'react-icons/io5';

import ConfirmModal from '../../components/ui/ConfirmModal';

const DEFAULT_FALLBACK_TEMPLATES = [
  {
    id: 'tmpl_welcome',
    name: 'welcome_message',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'en_US',
    header_type: 'TEXT',
    header_text: 'Welcome to AOTMS',
    body_text: 'Hello {{1}}, welcome to AOTMS! We are thrilled to connect with you regarding our specialized career programs.',
    footer_text: 'AOTMS Team',
    buttons: [{ text: 'Explore Programs' }, { text: 'Contact Counselor' }]
  },
  {
    id: 'tmpl_update',
    name: 'general_announcement',
    status: 'APPROVED',
    category: 'UTILITY',
    language: 'en_US',
    header_type: 'TEXT',
    header_text: 'Special Announcement',
    body_text: 'Dear {{1}}, we have exciting new updates and offers tailored for you. Reply to this message for instant assistance!',
    footer_text: 'AOTMS Official',
    buttons: [{ text: 'Chat with Us' }]
  },
  {
    id: 'tmpl_followup',
    name: 'course_followup',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'en_US',
    header_type: 'TEXT',
    header_text: 'Program Follow-up',
    body_text: 'Hi {{1}}, this is a follow-up reminder from AOTMS. Are you ready to enroll in your upcoming batch?',
    footer_text: 'Admissions Desk',
    buttons: [{ text: 'Confirm Interest' }]
  }
];

export default function WhatsappBlast() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [recipientType, setRecipientType] = useState('contacts'); // 'contacts' or 'leads'
  
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewRecipientId, setPreviewRecipientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // In-App Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'primary',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null
  });

  // Dispatch Progress & Results
  const [sending, setSending] = useState(false);
  const [blastResult, setBlastResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Live Test Message State
  const [testPhone, setTestPhone] = useState('7995232673');
  const [sendingTest, setSendingTest] = useState(false);

  const getApiBase = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
    }
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:5000';
    }
    return 'https://crm-1-62pl.onrender.com';
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch templates, leads, and contacts from backend
  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('aotms_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [tmplRes, leadsRes, contactsRes] = await Promise.all([
        fetch(`${getApiBase()}/api/integrations/whatsapp/templates`, { headers: authHeaders }).catch(() => null),
        fetch(`${getApiBase()}/api/leads`, { headers: authHeaders }).catch(() => null),
        fetch(`${getApiBase()}/api/contacts`, { headers: authHeaders }).catch(() => null)
      ]);

      let rawTemplates = [];
      if (tmplRes && tmplRes.ok) {
        const tmplData = await tmplRes.json();
        if (tmplData && Array.isArray(tmplData.templates) && tmplData.templates.length > 0) {
          rawTemplates = tmplData.templates;
        } else if (Array.isArray(tmplData) && tmplData.length > 0) {
          rawTemplates = tmplData;
        }
      }

      // If templates endpoint yielded nothing, attempt message-templates
      if (rawTemplates.length === 0) {
        try {
          const msgRes = await fetch(`${getApiBase()}/api/message-templates?type=whatsapp`, { headers: authHeaders });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            if (msgData && Array.isArray(msgData.templates) && msgData.templates.length > 0) {
              rawTemplates = msgData.templates;
            }
          }
        } catch (_) {}
      }

      // Fallback to built-in templates so templates are ALWAYS allowed and previewable
      if (rawTemplates.length === 0) {
        rawTemplates = DEFAULT_FALLBACK_TEMPLATES;
      }

      const mapped = rawTemplates.map(t => {
        const bodyComp = Array.isArray(t.components) ? t.components.find(c => c.type === 'BODY') : null;
        const footerComp = Array.isArray(t.components) ? t.components.find(c => c.type === 'FOOTER') : null;
        const headerComp = Array.isArray(t.components) ? t.components.find(c => c.type === 'HEADER') : null;
        const buttonsComp = Array.isArray(t.components) ? t.components.find(c => c.type === 'BUTTONS') : null;

        let headerType = t.header_type || (t.imageUrl ? 'IMAGE' : (headerComp ? (headerComp.format || 'NONE') : 'NONE'));
        let headerText = t.header_text || (headerComp?.format === 'TEXT' ? (headerComp.text || '') : '');
        let headerImageUrl = t.imageUrl || t.header_image_url || (headerComp?.example?.header_handle?.[0] || '');
        let headerContent = headerImageUrl || headerText || t.header_content || '';
        let bodyText = t.message || bodyComp?.text || t.body_text || t.title || 'Hello {{1}}!';
        let footerText = t.footer || footerComp?.text || t.footer_text || '';
        let buttonsList = t.buttons || (buttonsComp?.buttons || []);

        return {
          ...t,
          id: String(t._id || t.id || t.name || Math.random().toString()),
          name: t.name || t.shortcut || t.title || 'template',
          status: t.metaStatus || t.status || 'APPROVED',
          header_type: headerType,
          header_text: headerText,
          header_image_url: headerImageUrl,
          header_content: headerContent,
          body_text: bodyText,
          footer_text: footerText,
          buttons: buttonsList
        };
      });

      setTemplates(mapped);
      if (mapped.length > 0) {
        setSelectedTemplate(mapped[0]);
      }

      let loadedLeads = [];
      let loadedContacts = [];

      if (leadsRes && leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const rawLeads = leadsData.leads || (Array.isArray(leadsData) ? leadsData : []);
        if (Array.isArray(rawLeads)) {
          loadedLeads = rawLeads.map((l, index) => ({
            ...l,
            id: String(l._id || l.id || `lead_${index}`),
            name: l.name || l.contactName || l.full_name || l.phone || 'Lead',
            phone: l.phone || l.mobile || l.phoneNumber || '',
            email: l.email || '',
            identity: l.identity || l.customFields?.identity || 'Inquiries'
          }));
          setLeads(loadedLeads);
        }
      }

      if (contactsRes && contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const rawContacts = contactsData.contacts || (Array.isArray(contactsData) ? contactsData : []);
        if (Array.isArray(rawContacts)) {
          loadedContacts = rawContacts.map((c, index) => ({
            ...c,
            id: String(c._id || c.id || c.phone || `contact_${index}`),
            name: c.name || c.contactName || c.full_name || c.contact_name || c.phone || 'Contact',
            phone: c.phone || c.mobile || c.phoneNumber || c.phone_number || '',
            email: c.email || '',
            identity: (c.identity && c.identity !== 'General') ? c.identity : 'SAP FICO'
          }));
          setContacts(loadedContacts);
        }
      }

      // Default select all contacts first if present, otherwise leads
      if (loadedContacts.length > 0) {
        setRecipientType('contacts');
        setSelectedIds(loadedContacts.map(c => c.id));
      } else if (loadedLeads.length > 0) {
        setRecipientType('leads');
        setSelectedIds(loadedLeads.map(l => l.id));
      }
    } catch (err) {
      console.error("Failed to load blast data:", err);
      setTemplates(DEFAULT_FALLBACK_TEMPLATES);
      setSelectedTemplate(DEFAULT_FALLBACK_TEMPLATES[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getItemId = (item) => String(item?._id || item?.id || item?.phone || '');

  // Switch Recipient Type
  const handleSwitchRecipientType = (type) => {
    setRecipientType(type);
    setStatusFilter('ALL');
    const targetList = type === 'contacts' ? contacts : leads;
    setSelectedIds(targetList.map(item => getItemId(item)));
    setPreviewRecipientId(null);
  };

  // Dynamic Contact Identities with Strict Case-Insensitive Deduplication
  const availableIdentities = (() => {
    const rawList = contacts.map(c => c.identity).filter(Boolean);
    const seen = new Set();
    const result = [];

    const defaultList = ['SAP FICO', 'Client', 'VIP', 'Lead', 'Vendor'];

    [...defaultList, ...rawList].forEach(id => {
      if (!id || id.trim() === '' || id === 'General') return;
      const cleanId = id.trim();
      const normalized = cleanId.toLowerCase().replace(/_/g, ' ');
      
      if (normalized === 'sap fico') {
        if (!seen.has('sap fico')) {
          seen.add('sap fico');
          result.push('SAP FICO');
        }
      } else if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(cleanId);
      }
    });

    return Array.from(new Set(result));
  })();

  // Active Recipient List
  const activeRawList = recipientType === 'contacts' ? contacts : leads;

  const filteredRecipients = activeRawList.filter(item => {
    const query = searchQuery.toLowerCase();
    
    if (recipientType === 'contacts') {
      const contactIdentity = (item.identity && item.identity !== 'General') ? item.identity : 'SAP FICO';
      const matchesIdentity = statusFilter === 'ALL' || contactIdentity.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = (item.name || '').toLowerCase().includes(query) ||
                            (item.phone || '').toLowerCase().includes(query) ||
                            (item.email || '').toLowerCase().includes(query) ||
                            contactIdentity.toLowerCase().includes(query);
      return matchesIdentity && matchesSearch;
    } else {
      const itemStatus = (item.status || item.pipeline_stage || 'Inquiries').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || itemStatus === statusFilter.toUpperCase();
      const matchesSearch = (item.name || '').toLowerCase().includes(query) ||
                            (item.phone || '').toLowerCase().includes(query) ||
                            (item.address || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    }
  });

  const isAllSelected = filteredRecipients.length > 0 && filteredRecipients.every(item => selectedIds.includes(getItemId(item)));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredRecipients.map(fr => getItemId(fr)));
      setSelectedIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...filteredRecipients.map(item => getItemId(item))]));
      setSelectedIds(combined);
    }
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelectItem = (itemOrId) => {
    const strId = typeof itemOrId === 'object' ? getItemId(itemOrId) : String(itemOrId || '');
    if (!strId) return;
    setSelectedIds(prev => 
      prev.includes(strId) ? prev.filter(i => i !== strId) : [...prev, strId]
    );
  };

  // Preview Recipient (Allow previewing any selected contact or recipient)
  const activePreviewRecipient = (previewRecipientId && activeRawList.find(item => getItemId(item) === previewRecipientId))
    || activeRawList.find(item => selectedIds.includes(getItemId(item)))
    || activeRawList[0]
    || { name: 'Recipient', phone: '9876543210', identity: 'SAP FICO' };

  const renderBodyWithVariables = (bodyText) => {
    if (!bodyText) return '';
    const rName = activePreviewRecipient.name || 'Valued Client';
    const rFirstName = (activePreviewRecipient.name || '').split(' ')[0] || rName;
    const rIdentity = activePreviewRecipient.identity || 'SAP FICO';
    const rPhone = activePreviewRecipient.phone || '9876543210';
    const rEmail = activePreviewRecipient.email || '';

    return bodyText
      .replace(/\{\{1\}\}/g, rName)
      .replace(/\{\{2\}\}/g, rIdentity)
      .replace(/\{\{3\}\}/g, rPhone)
      .replace(/\{\{name\}\}/gi, rName)
      .replace(/\{\{first_name\}\}/gi, rFirstName)
      .replace(/\{\{identity\}\}/gi, rIdentity)
      .replace(/\{\{phone\}\}/gi, rPhone)
      .replace(/\{\{email\}\}/gi, rEmail);
  };

  // 1-Click Single Test Message Sender
  const handleSendSingleTest = async () => {
    if (!testPhone || testPhone.trim().length < 10) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }
    setSendingTest(true);
    const token = localStorage.getItem('aotms_token');
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };

    try {
      let res = await fetch(`${getApiBase()}/api/contacts/send-single-whatsapp`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          phone: testPhone,
          template_name: selectedTemplate?.name || 'hello_world'
        })
      });
      if (!res.ok) {
        res = await fetch(`${getApiBase()}/api/leads/send-single-whatsapp`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            phone: testPhone,
            template_name: selectedTemplate?.name || 'hello_world'
          })
        });
      }
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Test message sent to +91 ${testPhone}!`, "success");
      } else {
        throw new Error(data.message || data.error || data.detail || "Failed to send test message.");
      }
    } catch (err) {
      showToast(err.message || "Failed to send test message.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  // Trigger Batch WhatsApp Blast Action
  const handleTriggerBlast = () => {
    if (!selectedTemplate) {
      showToast("Please select a WhatsApp template first.", "error");
      return;
    }
    if (selectedIds.length === 0) {
      showToast(`Please select at least one ${recipientType === 'contacts' ? 'contact' : 'lead'} for the WhatsApp blast.`, "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Dispatch WhatsApp Broadcast",
      message: `Are you sure you want to trigger WhatsApp Blast using template '${selectedTemplate.name}' to ${selectedIds.length} ${recipientType}?`,
      type: "primary",
      confirmText: "OK, Send Blast",
      cancelText: "Cancel",
      onConfirm: executeBlast
    });
  };

  const executeBlast = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setSending(true);
    setBlastResult(null);

    const token = localStorage.getItem('aotms_token');
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };

    const payload = {
      template_name: selectedTemplate.name,
      language: selectedTemplate.language || 'en_US',
      contact_ids: recipientType === 'contacts' ? selectedIds : [],
      lead_ids: recipientType === 'leads' ? selectedIds : [],
      recipient_type: recipientType,
      sample_values: [activePreviewRecipient.name || 'Client', activePreviewRecipient.identity || 'AOTMS']
    };

    try {
      let res = await fetch(`${getApiBase()}/api/contacts/whatsapp-blast`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${getApiBase()}/api/leads/whatsapp-blast`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
      }

      const result = await res.json();
      if (res.ok && result.success) {
        setBlastResult(result);
        showToast(result.message || `Blast dispatched successfully to ${result.successful} ${recipientType}!`, "success");
      } else {
        throw new Error(result.message || result.detail || "WhatsApp Blast failed to send.");
      }
    } catch (err) {
      showToast(err.message || "Failed to dispatch WhatsApp blast.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4 w-full animate-in fade-in duration-150">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-xs transition-all animate-in fade-in ${
          toastType === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {toastType === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-medium text-slate-800 tracking-tight">
                WhatsApp Blast Studio (Contacts & Leads Engine)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                Meta Cloud API Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Select Meta Approved Template &rarr; Toggle Contacts or Leads &rarr; Select Recipients (Select All or Individual) &rarr; Send Message Trigger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/whatsapp')}
            className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-medium text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <WhatsApp className="w-4 h-4 text-sky-600" />
            <span>Open WhatsApp CRM Inbox</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerBlast}
            disabled={sending || selectedIds.length === 0 || !selectedTemplate}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 hover:shadow-sm active:scale-98"
          >
            {sending ? <RotateCw className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
            <span>{sending ? 'Dispatching...' : `Send Blast (${selectedIds.length} ${recipientType === 'contacts' ? 'Contacts' : 'Leads'})`}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-normal">Loading templates, contacts, and leads...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* STEP 1: SELECT APPROVED TEMPLATE (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-medium text-slate-800 uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-medium flex items-center justify-center">1</span>
                <span>Select Approved Template</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-normal">{templates.length} Templates</span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] scrollbar-thin">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplate?.name === tmpl.name;
                return (
                  <div
                    key={tmpl.id || tmpl.name}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium font-mono text-slate-800 truncate">{tmpl.name}</span>
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {tmpl.status || 'APPROVED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 font-normal">
                      <span className="uppercase text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 font-medium">{tmpl.category}</span>
                      <span>•</span>
                      <span>{tmpl.language}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 font-normal">
                      {tmpl.body_text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SELECT RECIPIENTS (CONTACTS VS LEADS TOGGLE) (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-medium text-slate-800 uppercase font-mono tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-medium flex items-center justify-center">2</span>
                <span>Select Target Recipients</span>
              </h3>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                {selectedIds.length} / {filteredRecipients.length} Selected
              </span>
            </div>

            {/* SOURCE SWITCHER: CONTACTS VS LEADS */}
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => handleSwitchRecipientType('contacts')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recipientType === 'contacts'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BookUser className="w-4 h-4" />
                <span>Contacts ({contacts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchRecipientType('leads')}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recipientType === 'leads'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Target className="w-4 h-4" />
                <span>Leads ({leads.length})</span>
              </button>
            </div>

            {/* Select All, Unselect All & Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-emerald-700"
                >
                  {isAllSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                  <span>Select All ({filteredRecipients.length})</span>
                </button>

                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-[11px] font-medium text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    Unselect All
                  </button>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-sky-500 shadow-2xs"
              >
                {recipientType === 'contacts' ? (
                  <>
                    <option value="ALL">All Identities</option>
                    {availableIdentities.map(id => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="ALL">All Stages</option>
                    <option value="Inquiries">Inquiries</option>
                    <option value="Demo">Demo</option>
                    <option value="Enrolled">Enrolled</option>
                  </>
                )}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${recipientType} by name, phone...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-normal"
              />
            </div>

            {/* Recipients List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[380px] scrollbar-thin">
              {filteredRecipients.map((item) => {
                const itemId = getItemId(item);
                const isSelected = selectedIds.includes(itemId);
                const isPreviewed = activePreviewRecipient && getItemId(activePreviewRecipient) === itemId;
                const itemStatus = item.status || item.pipeline_stage || 'Inquiries';

                return (
                  <div
                    key={itemId}
                    onClick={() => {
                      toggleSelectItem(itemId);
                      setPreviewRecipientId(itemId);
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-300 text-slate-900 ring-1 ring-emerald-400/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    } ${isPreviewed ? 'ring-2 ring-emerald-500 shadow-xs' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-slate-300 shrink-0" />}
                      
                      {/* Avatar preview if image_url exists */}
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {(item.name || 'C').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">{item.name || item.phone || 'Contact'}</div>
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 font-normal truncate">
                          <span>{item.phone || 'No Phone'}</span>
                          {item.email && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 truncate max-w-[120px] font-normal">{item.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewRecipientId(itemId);
                        }}
                        title="Preview message template for this contact"
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                          isPreviewed ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800'
                        }`}
                      >
                        Preview
                      </button>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                        recipientType === 'contacts'
                          ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                          : 'bg-amber-50 text-amber-700 border-amber-200/80'
                      }`}>
                        {recipientType === 'contacts'
                          ? `🏷️ ${item.identity && item.identity !== 'General' ? item.identity : 'SAP FICO'}`
                          : itemStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: LIVE PREVIEW & TRIGGER RESULTS (3 Cols) */}
          <div className="lg:col-span-3 bg-slate-100/70 rounded-xl border border-slate-200 p-3.5 flex flex-col items-center justify-start">
            <div className="w-full max-w-xs bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col relative max-h-[550px]">
              
              {/* WhatsApp Mock Header */}
              <div className="bg-[#075e54] text-white p-3 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-2">
                  <WhatsApp className="w-4 h-4 text-emerald-300" />
                  <div>
                    <div className="text-xs font-medium font-mono">AOTMS Official</div>
                    <div className="text-[9px] text-emerald-100 font-normal">Live Personalization Preview</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono bg-[#128c7e] px-1.5 py-0.5 rounded text-white font-medium">Meta Ready</span>
              </div>

              {/* Dynamic Recipient Preview Selector */}
              <div className="bg-[#054c44] text-[10px] text-emerald-100 px-3 py-1.5 flex items-center justify-between border-t border-emerald-700/60">
                <span className="truncate">Preview for: <strong className="text-white font-medium">{activePreviewRecipient.name || 'Recipient'}</strong></span>
                {activePreviewRecipient.identity && (
                  <span className="text-[9px] bg-[#0c6b5e] text-emerald-100 px-1.5 py-0.2 rounded font-mono truncate max-w-[100px]">
                    {activePreviewRecipient.identity}
                  </span>
                )}
              </div>

              {/* Chat Canvas */}
              <div className="p-3 bg-[#efeae2] flex-1 overflow-y-auto space-y-2.5 text-xs" style={{ minHeight: '320px' }}>
                {selectedTemplate ? (
                  <div className="bg-white rounded-xl rounded-tl-none p-2.5 shadow-2xs border border-slate-200/60 space-y-2">
                    {selectedTemplate.header_type === 'IMAGE' && (selectedTemplate.header_image_url || selectedTemplate.header_content || selectedTemplate.imageUrl) && (
                      <div className="rounded-lg overflow-hidden max-h-36 w-full bg-slate-100 border border-slate-200">
                        <img src={selectedTemplate.header_image_url || selectedTemplate.header_content || selectedTemplate.imageUrl} alt="Header" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {selectedTemplate.header_type === 'TEXT' && (selectedTemplate.header_text || selectedTemplate.header_content) && (
                      <h4 className="text-xs font-medium text-slate-800 pb-1 border-b border-slate-100 font-sans">
                        {selectedTemplate.header_text || selectedTemplate.header_content}
                      </h4>
                    )}

                    <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                      {renderBodyWithVariables(selectedTemplate.body_text)}
                    </p>

                    {selectedTemplate.footer_text && (
                      <p className="text-[9px] text-slate-400 font-normal">{selectedTemplate.footer_text}</p>
                    )}

                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-mono">
                      <span>10:45 AM</span>
                      <span className="text-sky-500 font-medium">✓✓</span>
                    </div>

                    {/* Action buttons preview */}
                    {(() => {
                      let pButtons = [];
                      try {
                        pButtons = typeof selectedTemplate.buttons === 'string' ? JSON.parse(selectedTemplate.buttons) : (selectedTemplate.buttons || []);
                      } catch(e) { pButtons = []; }

                      return pButtons.length > 0 ? (
                        <div className="space-y-1 pt-1.5 border-t border-slate-100">
                          {pButtons.map((btn, i) => (
                            <div key={i} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center text-[10px] font-medium text-sky-600 flex items-center justify-center gap-1.5">
                              <span>{btn.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs font-normal">Select a template to view live preview</div>
                )}
              </div>

              {/* Live Selected Recipients Counter */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-normal">Selected ({recipientType}):</span>
                  <span className="font-medium font-mono text-emerald-700">{selectedIds.length} Selected</span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerBlast}
                  disabled={sending || selectedIds.length === 0 || !selectedTemplate}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {sending ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{sending ? 'Sending...' : `Send WhatsApp Blast to ${recipientType}`}</span>
                </button>
              </div>

            </div>

            {/* Blast Execution Summary Result Card */}
            {blastResult && (
              <div className="mt-3.5 w-full p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-800">Blast Execution Report</span>
                  <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Done
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <div className="font-normal text-[11px]">Success</div>
                    <div className="text-sm font-semibold">{blastResult.successful}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                    <div className="font-normal text-[11px]">Failed</div>
                    <div className="text-sm font-semibold">{blastResult.failed}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* In-App Confirmation Dialog (No Browser Localhost Popups) */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={sending}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
