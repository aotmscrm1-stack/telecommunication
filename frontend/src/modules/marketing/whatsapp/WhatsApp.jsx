import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Send,
  Sparkles,
  Phone,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  Clock,
  Trash2,
  X,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getWebSocketUrl } from '../../../services/api';
import { cn } from '@/lib/utils';

// Axios instance with auth token
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
    : '/api',
});
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('aotms_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const NAV_ITEMS = [
  {
    key: 'inbox',
    label: 'Inbox',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    key: 'templates',
    label: 'Templates',
    icon: <FileText className="w-4 h-4" />,
  },
];

// ── Hamburger Menu ─────────────────────────────────────────────────────────────
function HamburgerMenu({ activeTab, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        title="Navigation Menu"
        className={cn(
          'w-9 h-9 flex flex-col items-center justify-center gap-1 rounded-lg border transition-all duration-150',
          open
            ? 'bg-blue-50 border-blue-600 text-blue-600'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        )}
      >
        <span className="block w-4 h-0.5 bg-current rounded-full" />
        <span className="block w-4 h-0.5 bg-current rounded-full" />
        <span className="block w-4 h-0.5 bg-current rounded-full" />
      </button>

      {open && (
        <div className="absolute top-11 left-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[210px] overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Delivery Ticks ─────────────────────────────────────────────────────────────
function MessageTicks({ status }) {
  if (status === 'read') {
    return (
      <span title="Read (Double Blue Tick)" className="inline-flex items-center text-sky-400 ml-1">
        <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span title="Delivered (Double Gray Tick)" className="inline-flex items-center text-slate-300 ml-1">
        <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span title="Delivery Failed" className="inline-flex items-center text-red-300 ml-1 text-xs">
        <AlertCircle className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span title="Sent (Single Tick)" className="inline-flex items-center text-slate-300 ml-1">
      <Check className="w-3 h-3 stroke-[2.5]" />
    </span>
  );
}

// ── Date Grouping Label ────────────────────────────────────────────────────────
function getDateLabel(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (targetDate.getTime() === today.getTime()) return 'Today';
  if (targetDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function playWhatsAppRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function parseTemplateDoc(t) {
  if (!t) return null;
  const comps = Array.isArray(t.components) ? t.components : [];
  const header = comps.find((c) => String(c.type).toUpperCase() === 'HEADER');
  const body = comps.find((c) => String(c.type).toUpperCase() === 'BODY');
  const footerComp = comps.find((c) => String(c.type).toUpperCase() === 'FOOTER');
  const buttonsComp = comps.find((c) => String(c.type).toUpperCase() === 'BUTTONS');

  const headerImg =
    header?.example?.header_handle?.[0] ||
    header?.example?.header_url?.[0] ||
    t.header_image_url ||
    t.headerImage ||
    t.mediaUrl ||
    t.imageUrl ||
    t.mediaBase64 ||
    '';

  return {
    id: String(t._id || t.id || t.name),
    _id: t._id || t.id,
    name: t.shortcut || t.metaTemplateName || t.name || 'Template',
    shortcut: t.shortcut || t.metaTemplateName || t.name || '',
    metaTemplateName: t.metaTemplateName || t.shortcut || t.name || '',
    category: t.category || t.type || 'MARKETING',
    status: t.waStatus || t.metaStatus || t.status || 'APPROVED',
    language: t.language || 'en_US',
    body: body?.text || t.message || t.body_text || t.body || '',
    rejectedReason: t.rejectedReason || t.rejected_reason || '',
    headerText: header?.text || t.header_text || t.headerText || '',
    headerFormat: header?.format || t.headerType || t.header_type || t.headerFormat || '',
    headerImage: headerImg,
    footer: footerComp?.text || t.footer_text || t.footer || '',
    buttons: buttonsComp?.buttons || t.buttons || [],
    components: comps,
  };
}

// ── Rich Template Message Card Component ───────────────────────────────────────
function RichTemplateMessageCard({ message, templates = [], leadName = '' }) {
  const text = message.description || message.text || '';
  const extractedTemplateName =
    text.match(/\[(?:Template|Campaign):\s*([^\]]+)\]/i)?.[1]?.trim() ||
    (text.startsWith('@') ? text.slice(1).trim() : '');

  const cleanText = text.toLowerCase().trim();
  const cleanNorm = cleanText.replace(/[\s_]+/g, '');
  const cleanExtractedNorm = extractedTemplateName.toLowerCase().replace(/[\s_]+/g, '');

  const matchedTemplate = (templates || []).find((t) => {
    if (!t) return false;
    const tId = String(t.id || t._id || '');
    const mId = String(message.templateId || '');
    if (mId && tId === mId) return true;

    const tShortcut = (t.shortcut || '').toLowerCase().trim();
    const tShortcutNorm = tShortcut.replace(/[\s_]+/g, '');
    const tName = (t.metaTemplateName || t.name || '').toLowerCase().trim();
    const tNameNorm = tName.replace(/[\s_]+/g, '');

    const mName = (message.templateName || '').toLowerCase().trim();
    const mNameNorm = mName.replace(/[\s_]+/g, '');

    if (mNameNorm && (tShortcutNorm === mNameNorm || tNameNorm === mNameNorm)) return true;
    if (cleanExtractedNorm && (tShortcutNorm === cleanExtractedNorm || tNameNorm === cleanExtractedNorm)) return true;
    if (tShortcutNorm && cleanNorm.includes(tShortcutNorm)) return true;
    if (tNameNorm && cleanNorm.includes(tNameNorm)) return true;

    const tBody = (t.body || t.message || '').toLowerCase().trim().replace(/\{\{\d+\}\}/g, '').trim();
    const tBodyNorm = tBody.replace(/[\s_]+/g, '');
    if (tBodyNorm && tBodyNorm.length >= 8 && (cleanNorm.includes(tBodyNorm.slice(0, 15)) || tBodyNorm.includes(cleanNorm.slice(0, 15)))) {
      return true;
    }
    return false;
  });

  const category = matchedTemplate?.category || (text.toLowerCase().includes('marketing') ? 'MARKETING' : 'UTILITY');

  let imageUrl = matchedTemplate?.headerImage || matchedTemplate?.mediaUrl || matchedTemplate?.imageUrl || message.mediaUrl || message.headerImageUrl;
  if (!imageUrl && matchedTemplate?.components) {
    const headerComp = matchedTemplate.components.find((c) => String(c.type).toUpperCase() === 'HEADER');
    if (headerComp && (headerComp.format === 'IMAGE' || headerComp.example?.header_handle?.length || headerComp.example?.header_url?.length)) {
      imageUrl = headerComp.example?.header_handle?.[0] || headerComp.example?.header_url?.[0];
    }
  }

  const isImageHeader =
    (matchedTemplate?.headerFormat || matchedTemplate?.headerType || '').toUpperCase() === 'IMAGE' ||
    (matchedTemplate?.headerFormat || matchedTemplate?.headerType || '').toUpperCase() === 'MEDIA';
  if (!imageUrl && isImageHeader) {
    imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
  }

  const headerText = matchedTemplate?.headerText || message.headerText;

  let bodyDisplay = text;
  if (matchedTemplate?.body) {
    let b = matchedTemplate.body;
    const recipientName = leadName || message.leadName || message.contactName || 'Customer';
    b = b.replace(/\{\{1\}\}/g, recipientName).replace(/\{\{\d+\}\}/g, '');
    bodyDisplay = b;
  } else {
    const cleaned = text.replace(/^\[(?:Template|Campaign):\s*[^\]]+\]\s*/i, '').trim();
    if (cleaned) bodyDisplay = cleaned;
  }

  const footerText = matchedTemplate?.footer || message.footer;
  let buttons = matchedTemplate?.buttons || message.buttons || [];
  if (!Array.isArray(buttons)) buttons = [];

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm min-w-[240px] text-left">
      <div className={cn(
        'px-3 py-1.5 flex items-center justify-between border-b',
        category === 'MARKETING' ? 'bg-emerald-50/70 border-emerald-100' : 'bg-sky-50/70 border-sky-100'
      )}>
        <span className={cn(
          'text-[10px] font-extrabold uppercase tracking-wider',
          category === 'MARKETING' ? 'text-emerald-700' : 'text-sky-700'
        )}>
          {category === 'MARKETING' ? '📢 Marketing Template' : '⚙️ Utility Template'}
        </span>
        {(matchedTemplate?.shortcut || matchedTemplate?.name) && (
          <span className="text-[10px] font-semibold text-slate-500">
            @{matchedTemplate.shortcut || matchedTemplate.name}
          </span>
        )}
      </div>

      {imageUrl && (
        <div className="max-h-40 overflow-hidden bg-slate-900 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Template Header"
            className="w-full h-36 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
            }}
          />
        </div>
      )}

      {headerText && (
        <div className="px-3 pt-2 text-xs font-bold text-slate-900">
          {headerText}
        </div>
      )}

      <div className="px-3 py-2 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
        {bodyDisplay}
      </div>

      {footerText && (
        <div className="px-3 pb-2 text-[10px] text-slate-400 italic">
          {footerText}
        </div>
      )}

      {buttons.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 flex flex-col">
          {buttons.map((btn, bIdx) => {
            const btnText = typeof btn === 'string' ? btn : btn.text || btn.value || 'Action Button';
            const btnType = typeof btn === 'object' ? (btn.type || '').toUpperCase() : 'QUICK_REPLY';
            const btnUrl = btn.url || btn.value;
            const btnPhone = btn.phone_number || btn.value;

            return (
              <button
                key={bIdx}
                onClick={() => {
                  if (btnType.includes('URL') && btnUrl) {
                    window.open(btnUrl.startsWith('http') ? btnUrl : `https://${btnUrl}`, '_blank');
                  } else if (btnType.includes('PHONE') && btnPhone) {
                    window.location.href = `tel:${btnPhone}`;
                  }
                }}
                className={cn(
                  'px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5',
                  bIdx > 0 && 'border-t border-slate-100'
                )}
              >
                {btnType.includes('URL') ? '🔗 ' : btnType.includes('PHONE') ? '📞 ' : '🔘 '}
                {btnText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Inbox Tab ──────────────────────────────────────────────────────────────────
function InboxTab({ onSendTemplate }) {
  const { user } = useAuth();
  const activeThreadStorageKey = user?._id ? `wa_${user._id}_active_lead_id` : 'wa_active_lead_id';

  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
  ];

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0 });
  const [loadingList, setLoadingList] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedIdentity, setSelectedIdentity] = useState('ALL');
  const [backendIdentities, setBackendIdentities] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showSendTemplateModal, setShowSendTemplateModal] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templateSearchText, setTemplateSearchText] = useState('');

  const handleChatScroll = (e) => {
    const el = e.target;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceToBottom > 120);
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Fetch Unified Templates
  useEffect(() => {
    api.get('/integrations/whatsapp/templates')
      .then((res) => {
        const raw = res.data?.templates || [];
        if (Array.isArray(raw) && raw.length > 0) return raw;
        return api.get('/message-templates', { params: { type: 'whatsapp' } })
          .then((mRes) => mRes.data?.templates || mRes.data || []);
      })
      .catch(() => {
        return api.get('/message-templates', { params: { type: 'whatsapp' } })
          .then((mRes) => mRes.data?.templates || mRes.data || [])
          .catch(() => []);
      })
      .then((raw) => {
        if (Array.isArray(raw)) {
          setTemplates(raw.map((t) => parseTemplateDoc(t)).filter(Boolean));
        }
      });
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts');
      setContacts(res.data?.contacts || []);
    } catch {}
  };

  const fetchLeads = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/whatsapp-inbox', { params: { tab, search } });
      const fetchedLeads = res.data.leads || [];
      setLeads(fetchedLeads);
      setCounts(res.data.counts || { all: 0, pending: 0 });
      if (Array.isArray(res.data.existingIdentities)) {
        setBackendIdentities(res.data.existingIdentities);
      }

      const savedLeadId = localStorage.getItem(activeThreadStorageKey);
      const activeMatch = savedLeadId && fetchedLeads.find((l) => String(l._id) === String(savedLeadId));
      const targetId = activeMatch ? activeMatch._id : fetchedLeads[0] ? fetchedLeads[0]._id : null;

      if (targetId && !selectedId) {
        openThread(targetId, false);
      }
    } catch {} finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    fetchLeads();
    const handleSync = () => {
      fetchLeads();
      fetchContacts();
    };
    window.addEventListener('wa_data_synced', handleSync);
    return () => window.removeEventListener('wa_data_synced', handleSync);
  }, [tab, search]);

  const existingIdentities = (() => {
    const seen = new Set();
    const list = [];
    (backendIdentities || []).forEach((tag) => {
      const val = String(tag || '').trim();
      const norm = val.toLowerCase();
      if (val && norm !== 'all' && norm !== 'general' && !seen.has(norm)) {
        seen.add(norm);
        list.push(val);
      }
    });
    (contacts || []).forEach((c) => {
      const val = String(c.identity || '').trim();
      const norm = val.toLowerCase();
      if (val && norm !== 'all' && norm !== 'general' && !seen.has(norm)) {
        seen.add(norm);
        list.push(val);
      }
    });
    (leads || []).forEach((l) => {
      const val = String(l.identity || l.customFields?.identity || l.customFields?.Identity || '').trim();
      const norm = val.toLowerCase();
      if (val && norm !== 'all' && norm !== 'general' && !seen.has(norm)) {
        seen.add(norm);
        list.push(val);
      }
    });
    return list;
  })();

  const getLeadIdentity = (lead) => {
    if (!lead) return '';
    if (lead.identity && String(lead.identity).toLowerCase() !== 'general') return lead.identity;
    const p10 = String(lead.phone || '').slice(-10);
    const matched = contacts.find((c) => String(c.phone || '').slice(-10) === p10);
    if (matched?.identity && String(matched.identity).toLowerCase() !== 'general') return matched.identity;
    if (lead.customFields?.identity) return lead.customFields.identity;
    if (lead.customFields?.Identity) return lead.customFields.Identity;
    return lead.identity || '';
  };

  const displayedLeads = leads.filter((lead) => {
    if (selectedIdentity === 'ALL') return true;
    const idTag = getLeadIdentity(lead);
    return idTag.toLowerCase() === selectedIdentity.toLowerCase();
  });

  const openThread = async (leadId, refreshList = true) => {
    if (!leadId) return;
    setSelectedId(leadId);
    try {
      localStorage.setItem(activeThreadStorageKey, String(leadId));
    } catch {}
    setLoadingThread(true);
    try {
      const res = await api.get(`/whatsapp-inbox/${leadId}`);
      setThread(res.data);
      if (refreshList) {
        fetchLeads();
      }
    } catch {
      setThread(null);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [thread, scrollToBottom]);

  // Real-time WebSockets
  useEffect(() => {
    const wsUrl = getWebSocketUrl();

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const eventName = raw.event || raw.type;
          const payloadData = raw.payload || raw.data || {};

          if (eventName === 'whatsapp:status_update') {
            const { leadId, messageId, status } = payloadData;
            setThread((prev) => {
              if (!prev || !prev.thread) return prev;
              if (leadId && String(prev.lead?.id || prev.lead?._id || selectedId) !== String(leadId)) {
                return prev;
              }
              const updatedThread = prev.thread.map((m) => {
                if (m.metaMessageId === messageId || m._id === messageId) {
                  return { ...m, deliveryStatus: status, status };
                }
                return m;
              });
              return { ...prev, thread: updatedThread };
            });
          }

          if (eventName === 'whatsapp:incoming_message') {
            const { leadId, name, phone, text, messageId, timestamp } = payloadData;
            playWhatsAppRingtone();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`WhatsApp from ${name || phone}`, { body: text });
            }
            fetchLeads();
            setThread((prev) => {
              if (!prev) return prev;
              const activeId = String(prev.lead?.id || prev.lead?._id || selectedId);
              if (activeId !== String(leadId)) return prev;

              const newMsg = {
                _id: messageId || String(Date.now()),
                type: 'whatsapp',
                direction: 'inbound',
                description: text,
                metaMessageId: messageId,
                createdAt: timestamp || new Date().toISOString(),
              };
              return {
                ...prev,
                withinWindow: true,
                thread: [...(prev.thread || []), newMsg],
              };
            });
          }
        } catch (err) {}
      };
    } catch (err) {}

    return () => {
      if (socket) socket.close();
    };
  }, [selectedId]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      await api.post(`/whatsapp-inbox/${selectedId}/reply`, { text: replyText.trim() });
      setReplyText('');
      await openThread(selectedId);
      await fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleSendRealTemplate = async () => {
    if (!selectedTemplateId || !selectedId || sendingTemplate) return;
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tmpl) return;

    setSendingTemplate(true);
    try {
      await api.post(`/whatsapp-inbox/${selectedId}/reply`, {
        templateName: tmpl.shortcut || tmpl.metaTemplateName || tmpl.name,
        languageCode: tmpl.language || 'en_US',
      });
      setShowSendTemplateModal(false);
      setSelectedTemplateId(null);
      await openThread(selectedId);
      await fetchLeads();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch Meta WhatsApp template');
    } finally {
      setSendingTemplate(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 w-full bg-white relative">
      {/* ── Left Sidebar: Leads List ────────────────────────────────────────── */}
      <div className="w-80 md:w-84 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSelectedId(null);
                  setThread(null);
                }}
                className={cn(
                  'flex-1 py-3 px-2 text-xs font-semibold text-center border-b-2 transition-all',
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                )}
              >
                {t.label} ({counts[t.key] ?? 0})
              </button>
            );
          })}
        </div>

        {/* Search & Identity Filter */}
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2.5 bg-white">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider shrink-0 mr-1">
              Tag:
            </span>
            <button
              onClick={() => setSelectedIdentity('ALL')}
              className={cn(
                'px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors',
                selectedIdentity === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              All
            </button>
            {existingIdentities.map((idName) => {
              const isSelected = selectedIdentity.toLowerCase() === idName.toLowerCase();
              return (
                <button
                  key={idName}
                  onClick={() => setSelectedIdentity(idName)}
                  className={cn(
                    'px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {idName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leads Scroll Area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingList && (
            <div className="p-8 text-center text-xs text-slate-400">Loading leads...</div>
          )}
          {!loadingList && displayedLeads.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              {selectedIdentity !== 'ALL'
                ? `No leads found for "${selectedIdentity}".`
                : 'No conversations found.'}
            </div>
          )}
          {!loadingList &&
            displayedLeads.map((lead) => {
              const isSelected = selectedId === lead._id;
              const identity = getLeadIdentity(lead);
              const initials = (lead.name || lead.phone || 'L').charAt(0).toUpperCase();

              return (
                <div
                  key={lead._id}
                  onClick={() => openThread(lead._id)}
                  className={cn(
                    'p-3 cursor-pointer transition-all flex items-start gap-3 border-l-4',
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600'
                      : 'border-transparent hover:bg-slate-50'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {lead.name || lead.phone}
                      </span>
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          lead.waStatus === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      {identity && (
                        <span className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 rounded px-1.5 py-0.2 shrink-0">
                          {identity}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono truncate">
                        {lead.phone}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate">
                      {lead.lastWaMessagePreview || 'No messages yet'}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Right: Clean White Chatting Session ───────────────────────────── */}
      <div className="flex-1 flex flex-col h-full bg-white relative min-w-0 overflow-hidden">
        {!selectedId && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Conversation Selected</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Choose a contact from the left list to start live chatting and dispatch WhatsApp templates.
            </p>
          </div>
        )}

        {selectedId && loadingThread && (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 bg-white">
            Loading messages...
          </div>
        )}

        {selectedId && !loadingThread && thread && (
          <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200/90 flex items-center justify-between bg-white z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {(thread.lead.name || thread.lead.phone || 'L').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 leading-none">
                      {thread.lead.name || thread.lead.phone}
                    </span>
                    {getLeadIdentity(thread.lead) && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 leading-none">
                        {getLeadIdentity(thread.lead)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {thread.lead.phone}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[11px] font-medium px-2 py-0.5 rounded-full border hidden sm:inline-flex items-center gap-1',
                    thread.withinWindow
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', thread.withinWindow ? 'bg-emerald-500' : 'bg-amber-500')} />
                  {thread.withinWindow ? '24h Active' : 'Window Expired'}
                </span>

                <a
                  href={`tel:${thread.lead.phone}`}
                  title="Direct Call"
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`https://wa.me/${String(thread.lead.phone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open WhatsApp Web"
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setShowSendTemplateModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Template</span>
                </button>
              </div>
            </div>

            {/* Scrollable Message History Area — Bounded Decreased Width & White Background */}
            <div
              ref={scrollRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto bg-white p-4 scroll-smooth"
            >
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
                {thread.thread.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-xs text-slate-400">
                      No messages in this chat yet. Send a greeting or template below.
                    </p>
                  </div>
                )}

                {(() => {
                  let lastDate = null;
                  return (thread.thread || []).map((m, i) => {
                    const isInbound = m.direction === 'inbound';
                    const currentDateLabel = getDateLabel(m.createdAt);
                    const showDateHeader = currentDateLabel && currentDateLabel !== lastDate;
                    if (showDateHeader) {
                      lastDate = currentDateLabel;
                    }

                    const isTemplate =
                      m.description?.startsWith('[Template:') ||
                      m.description?.startsWith('@') ||
                      m.isTemplate ||
                      m.type === 'template' ||
                      Boolean(m.templateName) ||
                      Boolean(m.templateId);

                    return (
                      <React.Fragment key={m._id || i}>
                        {showDateHeader && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200/60 px-3 py-0.5 rounded-full shadow-2xs">
                              {currentDateLabel}
                            </span>
                          </div>
                        )}

                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={cn('flex w-full', isInbound ? 'justify-start' : 'justify-end')}
                        >
                          <div className={cn('flex items-end gap-2 max-w-[80%]', !isInbound && 'flex-row-reverse')}>
                            {isInbound && (
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                                {(thread.lead.name || 'C').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="flex flex-col">
                              {/* Employee who sent the message/template */}
                              {!isInbound && (m.performedByName || m.performedBy?.name || m.userName || user?.name) && (
                                <div className="text-[10px] font-semibold text-slate-400 mb-0.5 text-right flex items-center justify-end gap-1">
                                  <span>Sent by:</span>
                                  <span className="text-slate-600 font-bold">{m.performedByName || m.performedBy?.name || m.userName || user?.name}</span>
                                </div>
                              )}

                              <div
                                className={cn(
                                  'text-xs leading-relaxed transition-all',
                                  isTemplate
                                    ? 'bg-transparent border-0 shadow-none p-0'
                                    : isInbound
                                    ? 'rounded-2xl rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-900 px-3.5 py-2 shadow-xs'
                                    : 'rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-2 shadow-xs'
                                )}
                              >
                                {isTemplate ? (
                                  <RichTemplateMessageCard message={m} templates={templates} leadName={thread.lead.name} />
                                ) : (
                                  <div className="whitespace-pre-wrap break-words">{m.description}</div>
                                )}

                                <div
                                  className={cn(
                                    'text-[10px] mt-1 flex items-center justify-end gap-1',
                                    isTemplate || isInbound ? 'text-slate-400' : 'text-blue-100'
                                  )}
                                >
                                  <span>
                                    {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {!isInbound && (
                                    <MessageTicks status={m.deliveryStatus || m.status || 'sent'} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Floating Scroll to Bottom */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute right-6 bottom-20 w-9 h-9 rounded-full bg-white text-blue-600 border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all z-20"
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Input Area — Modeled directly on ChatMessages */}
            <div className="border-t border-slate-200 p-3 bg-white z-10 shrink-0">
              <div className="w-full max-w-2xl mx-auto">
                {thread.withinWindow ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <button
                      type="button"
                      onClick={() => setShowSendTemplateModal(true)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors shrink-0 flex items-center gap-1"
                      title="Select Meta Template"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Template</span>
                    </button>

                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                    />

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0',
                        sending || !replyText.trim()
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                      )}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <div>
                      <div className="text-xs font-bold text-amber-900">24-Hour Session Closed</div>
                      <div className="text-[11px] text-amber-700">
                        To message this customer, send a pre-approved Meta WhatsApp template.
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSendTemplateModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Select Template</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Meta WhatsApp Template Selection Modal ───────────────────────── */}
      {showSendTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Meta Template</h3>
                <p className="text-[11px] text-slate-500">
                  Sends directly to +91 {thread?.lead?.phone} via official WhatsApp API
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSendTemplateModal(false);
                  setSelectedTemplateId(null);
                  setTemplateSearchText('');
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  value={templateSearchText}
                  onChange={(e) => setTemplateSearchText(e.target.value)}
                  placeholder="Search template name or text..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              {templates
                .filter(
                  (t) =>
                    (t.name || t.shortcut || '').toLowerCase().includes(templateSearchText.toLowerCase()) ||
                    (t.body || '').toLowerCase().includes(templateSearchText.toLowerCase())
                )
                .map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer transition-all',
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{tmpl.shortcut || tmpl.name}</span>
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.2">
                          {tmpl.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {tmpl.body}
                      </p>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => {
                  setShowSendTemplateModal(false);
                  setSelectedTemplateId(null);
                  setTemplateSearchText('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRealTemplate}
                disabled={!selectedTemplateId || sendingTemplate}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  !selectedTemplateId || sendingTemplate
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                )}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTemplate ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Template Form ──────────────────────────────────────────────────────────
function AddTemplateForm({ onCancel, onSave, integrationId }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Marketing');
  const [language, setLanguage] = useState('English');
  const [headerType, setHeaderType] = useState('Text');
  const [headerText, setHeaderText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const fileRef = useRef(null);

  const addButton = (btnType) => {
    if (buttons.length >= 3) return;
    setButtons((p) => [...p, { type: btnType, text: '', value: '' }]);
  };
  const removeButton = (i) => setButtons((p) => p.filter((_, idx) => idx !== i));
  const updateButton = (i, field, val) =>
    setButtons((p) => p.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));

  const handleMedia = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setMediaFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setMediaPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return setSubmitError('Template name is required.');
    if (!message.trim()) return setSubmitError('Message body is required.');
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);
    try {
      const endpoint = integrationId
        ? `/integrations/${integrationId}/whatsapp/templates`
        : '/integrations/whatsapp/templates';
      const res = await api.post(endpoint, {
        name,
        category: type,
        language,
        headerType,
        headerText,
        mediaBase64: mediaPreview,
        mediaMimeType: mediaFile?.type || 'image/png',
        message,
        footer,
        buttons,
      });
      setSubmitSuccess(`Template submitted to Meta! Status: ${res.data.status || 'PENDING'}`);
      onSave();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Create Meta WhatsApp Template</h2>
        <p className="text-xs text-slate-500">
          Templates are submitted to Meta for verification and pre-approval.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. welcome_offer"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            >
              <option>Marketing</option>
              <option>Utility</option>
              <option>Authentication</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Telugu</option>
              <option>Tamil</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Header Type</label>
          <select
            value={headerType}
            onChange={(e) => {
              setHeaderType(e.target.value);
              setMediaFile(null);
              setMediaPreview(null);
            }}
            className="w-full sm:w-64 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          >
            <option value="Text">Text</option>
            <option value="Media">Media (Image/Video)</option>
            <option value="None">None</option>
          </select>
        </div>

        {headerType === 'Text' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Header Text</label>
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              maxLength={60}
              placeholder="Short catchy header"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        )}

        {headerType === 'Media' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Media</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {mediaPreview ? (
                <div className="flex items-center justify-center gap-3">
                  <img src={mediaPreview} alt="preview" className="h-16 w-24 object-cover rounded-md" />
                  <span className="text-xs text-slate-600">{mediaFile?.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-medium">Click to upload media</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMedia} />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Message Body <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Hi {{1}}, welcome to our platform!"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Text</label>
          <input
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            maxLength={60}
            placeholder="Optional footer text"
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Buttons</label>
          <div className="flex gap-2 mb-2">
            {['Quick Reply', 'Phone Number', 'URL'].map((b) => (
              <button
                key={b}
                type="button"
                disabled={buttons.length >= 3}
                onClick={() => addButton(b)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                + {b}
              </button>
            ))}
          </div>

          {buttons.map((btn, i) => (
            <div key={i} className="flex gap-2 items-center mb-2 bg-slate-50 p-2 rounded-lg">
              <span className="text-[11px] font-bold text-slate-600 min-w-20">{btn.type}</span>
              <input
                placeholder="Button Label"
                value={btn.text}
                onChange={(e) => updateButton(i, 'text', e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
              />
              {btn.type !== 'Quick Reply' && (
                <input
                  placeholder={btn.type === 'URL' ? 'https://...' : '+91...'}
                  value={btn.value}
                  onChange={(e) => updateButton(i, 'value', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                />
              )}
              <button
                type="button"
                onClick={() => removeButton(i)}
                className="text-red-500 hover:text-red-700 px-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs">
            {submitSuccess}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit to Meta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [integrationId, setIntegrationId] = useState(null);

  const loadTemplates = useCallback(() => {
    setLoading(true);
    api.get('/integrations/whatsapp/templates')
      .then((res) => {
        const raw = res.data?.templates || [];
        if (Array.isArray(raw) && raw.length > 0) return raw;
        return api.get('/message-templates', { params: { type: 'whatsapp' } })
          .then((mRes) => mRes.data?.templates || mRes.data || []);
      })
      .catch(() => {
        return api.get('/message-templates', { params: { type: 'whatsapp' } })
          .then((mRes) => mRes.data?.templates || mRes.data || [])
          .catch(() => []);
      })
      .then((raw) => {
        const mapped = (raw || []).map((t) => parseTemplateDoc(t)).filter(Boolean);
        setTemplates(mapped);
        if (mapped.length > 0) {
          setPreviewId((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0].id));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/integrations')
      .then((res) => {
        const integrations = res.data?.integrations || [];
        const wa = integrations.find((i) => i.type === 'whatsapp_cloud' && i.status === 'active');
        if (wa) setIntegrationId(wa._id);
      })
      .catch(() => {});
    loadTemplates();
  }, [loadTemplates]);

  const syncWithMeta = async () => {
    setSyncing(true);
    try {
      const endpoint = integrationId
        ? `/integrations/${integrationId}/whatsapp/templates/sync`
        : '/integrations/whatsapp/templates/sync';
      await api.post(endpoint);
      loadTemplates();
    } catch {} finally {
      setSyncing(false);
    }
  };

  const filtered = templates.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedTemplate = templates.find((t) => t.id === previewId);

  if (creating) {
    return (
      <AddTemplateForm
        integrationId={integrationId}
        onCancel={() => setCreating(false)}
        onSave={() => {
          setCreating(false);
          loadTemplates();
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 h-full bg-white">
      {/* Templates List */}
      <div className="w-80 md:w-88 border-r border-slate-200 flex flex-col h-full bg-white shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">{templates.length} Templates</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={syncWithMeta}
                disabled={syncing}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold"
                title="Sync from Meta"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
              </button>
              <button
                onClick={() => setCreating(true)}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading && <div className="p-8 text-center text-xs text-slate-400">Loading templates...</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">No templates found.</div>
          )}
          {!loading &&
            filtered.map((t) => {
              const isSelected = previewId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setPreviewId(t.id)}
                  className={cn(
                    'p-3 cursor-pointer transition-all border-l-4',
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600'
                      : 'border-transparent hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 truncate">{t.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0.2 rounded',
                        t.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      )}
                    >
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{t.body}</div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Template Detail View */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {selectedTemplate ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTemplate.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-semibold text-blue-600 uppercase text-[10px]">
                    {selectedTemplate.category}
                  </span>
                  <span>•</span>
                  <span>Language: {selectedTemplate.language}</span>
                  <span>•</span>
                  <span className="font-medium text-emerald-600">{selectedTemplate.status}</span>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (window.confirm(`Delete template "${selectedTemplate.name}"?`)) {
                    try {
                      await api.delete(`/message-templates/${selectedTemplate.id}`);
                      loadTemplates();
                    } catch (err) {
                      alert('Failed to delete template');
                    }
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Template Card Render */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Message Preview
              </h4>
              <div className="max-w-md mx-auto">
                <RichTemplateMessageCard
                  message={{
                    description: `[Template: ${selectedTemplate.name}]`,
                    templateId: selectedTemplate.id,
                  }}
                  templates={[selectedTemplate]}
                  leadName="Customer Name"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Select a template from the list to preview details.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main WhatsApp CRM Shell ────────────────────────────────────────────────────
export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [syncingData, setSyncingData] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const activeItem = NAV_ITEMS.find((n) => n.key === activeTab) || NAV_ITEMS[0];

  const handleSyncData = async () => {
    setSyncingData(true);
    setSyncSuccess(false);
    try {
      await api.post('/integrations/whatsapp/templates/sync').catch(() => {});
      await api.get('/contacts').catch(() => {});
      await api.get('/whatsapp-inbox').catch(() => {});
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      window.dispatchEvent(new CustomEvent('wa_data_synced'));
    } catch (err) {
    } finally {
      setSyncingData(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-84px)] max-h-[calc(100vh-84px)] bg-slate-50 w-full overflow-hidden">
      {/* Sub-Navbar Moved Down & Fully Responsive */}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 pt-2.5 sm:pt-3 pb-1 shrink-0 z-20">
        <header className="bg-white border border-slate-200/90 rounded-2xl px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-xs gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight truncate">WhatsApp CRM</div>
                <div className="text-[10px] text-blue-600 font-semibold leading-tight mt-0.5 truncate">
                  Business Suite
                </div>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-0.5 sm:mx-1 shrink-0" />

            <HamburgerMenu activeTab={activeTab} onSelect={setActiveTab} />

            <div className="hidden md:flex items-center gap-1.5 ml-1 text-xs font-semibold text-slate-700">
              <span className="text-blue-600">{activeItem.icon}</span>
              <span>{activeItem.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Responsive Quick Tab Toggle Buttons */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                    activeTab === item.key
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <span className={activeTab === item.key ? 'text-blue-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleSyncData}
              disabled={syncingData}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs',
                syncSuccess
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : syncingData
                  ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncingData && 'animate-spin')} />
              <span className="hidden sm:inline">{syncingData ? 'Syncing...' : syncSuccess ? 'Synced' : 'Sync'}</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Body — Responsive Decreased Width */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-2 sm:p-4 pt-1 sm:pt-2 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {activeTab === 'inbox' && <InboxTab onSendTemplate={() => setActiveTab('templates')} />}
          {activeTab === 'templates' && <TemplatesTab />}
        </div>
      </main>
    </div>
  );
}
