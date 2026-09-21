import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiCopy, FiTrash2, FiSearch, FiMail, FiClock,
  FiSend, FiUsers, FiX, FiCheck, FiCheckCircle, FiAlertCircle,
  FiChevronDown, FiShare2, FiMessageSquare, FiFileText
} from 'react-icons/fi';
import { RiWhatsappLine, RiMailSendLine, RiMessage3Line } from 'react-icons/ri';
import { messageTemplatesAPI } from '../../services/api';
import EmailCampaignWizard from '../Email/EmailCampaignWizard';
import EmailTemplateModal from '../Email/EmailTemplateModal';
import EmailCampaignHistory from '../Email/EmailCampaignHistory';

// ── Sunset Warm Marketing Palette ─────────────────────────────────────────────
const O = {
  primary: '#ff8c42',
  primary3: '#ffb877',
  deep: '#e84a10',
  darkest: '#c23a05',

  bg: '#fff8f2',
  bgSoft: '#fff0e8',
  bgSofter: '#fff5ed',

  line: '#ffe0cb',
  lineSoft: '#ffe4d5',

  ink: '#1f1206',
  inkSoft: '#6b5546',
  muted: '#8f7667',

  success: '#10b981',
  successBg: '#ecfdf5',
  successLine: '#a7f3d0',

  warning: '#f59e0b',
  warningBg: '#fffbeb',
  warningLine: '#fde68a',

  error: '#ef4444',
  errorBg: '#fef2f2',
  errorLine: '#fecaca',

  white: '#ffffff',
};

const TABS = ['WHATSAPP', 'EMAIL'];
const TAB_TYPE_MAP = { WHATSAPP: 'whatsapp', EMAIL: 'email' };

export default function MessageTemplates() {
  const [activeTab, setActiveTab] = useState('WHATSAPP');
  const [selected, setSelected] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ shortcut: '', message: '', isShared: false });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // All | Mine | Shared
  const [emailSearch, setEmailSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Email campaign features state
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [showEmailCampaignWizard, setShowEmailCampaignWizard] = useState(false);
  const [showEmailHistory, setShowEmailHistory] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await messageTemplatesAPI.getAll({ type: TAB_TYPE_MAP[activeTab] });
      const all = res.data.templates || [];
      setTemplates(all);
      setSelected(all[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilter('All');
    setEmailSearch('');
    setSelected(null);
  };

  const handleAdd = async () => {
    if (!newTemplate.shortcut || !newTemplate.message) return;
    try {
      await messageTemplatesAPI.create({
        type: TAB_TYPE_MAP[activeTab],
        shortcut: newTemplate.shortcut,
        message: newTemplate.message,
        isShared: newTemplate.isShared,
      });
      setNewTemplate({ shortcut: '', message: '', isShared: false });
      setShowNewModal(false);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await messageTemplatesAPI.delete(id);
      fetchTemplates();
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  const handleCopy = (tpl) => {
    if (tpl.bodyFormat === 'html') {
      const el = document.createElement('div');
      el.innerHTML = tpl.message;
      navigator.clipboard.writeText(el.innerText || el.textContent || '');
    } else {
      navigator.clipboard.writeText(tpl.message);
    }
    setCopiedId(tpl._id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleEmailTemplateSaved = (tpl) => {
    setShowEmailTemplateModal(false);
    fetchTemplates();
    setSelected(tpl);
  };

  const openWizardFresh = () => {
    setWizardInitialData(null);
    setShowEmailCampaignWizard(true);
  };

  const handleReuseFromHistory = (data, mode) => {
    setShowEmailHistory(false);
    setWizardInitialData({ ...data, mode });
    setShowEmailCampaignWizard(true);
  };

  const filteredTemplates = templates.filter((t) => {
    if (activeTab === 'EMAIL') {
      const q = emailSearch.trim().toLowerCase();
      if (!q) return true;
      return (t.shortcut?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q));
    }
    if (filter === 'Mine') return !t.isShared;
    if (filter === 'Shared') return t.isShared;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-64px)] box-border overflow-hidden space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: O.deep }}>
            <RiMessage3Line className="w-4 h-4" /> Marketing Communication
          </div>
          <h1 className="text-2xl md:text-3xl font-black mt-0.5" style={{ color: O.ink }}>
            Message Templates
          </h1>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5">
            Craft, standardize, and share response templates for WhatsApp chat and Email campaigns.
          </p>
        </div>

        {/* Tab Selector Pills */}
        <div
          className="inline-flex p-1 rounded-2xl border bg-white shadow-sm self-start sm:self-auto"
          style={{ borderColor: O.line }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)`
                    : 'transparent',
                  color: isActive ? '#ffffff' : O.inkSoft,
                  boxShadow: isActive ? '0 2px 10px rgba(232, 74, 16, 0.25)' : 'none',
                }}
              >
                {tab === 'WHATSAPP' ? (
                  <RiWhatsappLine className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                ) : (
                  <FiMail className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-600'}`} />
                )}
                <span>{tab === 'WHATSAPP' ? 'WhatsApp Templates' : 'Email Campaigns'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main 2-Column Panel Layout ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 rounded-2xl border overflow-hidden bg-white shadow-sm"
        style={{ borderColor: O.line }}
      >
        {/* ── Left Sidebar (List) ── */}
        <div
          className="lg:col-span-4 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r"
          style={{ borderColor: O.line }}
        >
          {/* Email Tab Sub-header & Action Buttons */}
          {activeTab === 'EMAIL' ? (
            <div className="p-3.5 border-b space-y-3 flex-shrink-0" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
              {/* Search Bar & Add Button */}
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white focus-within:border-orange-500 transition-all"
                  style={{ borderColor: O.line }}
                >
                  <FiSearch className="w-3.5 h-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search email templates..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="w-full text-xs font-medium bg-transparent focus:outline-none"
                    style={{ color: O.ink }}
                  />
                  {emailSearch && (
                    <button onClick={() => setEmailSearch('')} className="text-stone-400 hover:text-stone-700">
                      <FiX className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  title="New Email Template"
                  onClick={() => setShowEmailTemplateModal(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
                >
                  <FiPlus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Primary Email Campaign Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openWizardFresh}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:brightness-105"
                  style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
                >
                  <RiMailSendLine className="w-4 h-4" /> New Campaign
                </button>
                <button
                  onClick={() => setShowEmailHistory(true)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors hover:bg-orange-50"
                  style={{ borderColor: O.line, color: O.deep, background: '#ffffff' }}
                >
                  <FiClock className="w-3.5 h-3.5" /> Past History
                </button>
              </div>
            </div>
          ) : (
            /* WhatsApp Tab Sub-header & Action Buttons */
            <div
              className="p-3.5 border-b flex items-center justify-between gap-2 flex-shrink-0"
              style={{ borderColor: O.lineSoft, background: O.bgSofter }}
            >
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border flex-1" style={{ borderColor: O.line }}>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Show:</span>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="text-xs font-bold bg-transparent focus:outline-none text-stone-700 cursor-pointer flex-1"
                >
                  <option value="All">All Templates</option>
                  <option value="Mine">My Templates</option>
                  <option value="Shared">Shared Team Templates</option>
                </select>
              </div>

              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 whitespace-nowrap"
                style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
              >
                <FiPlus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Template
              </button>
            </div>
          )}

          {/* Template List Items */}
          <div className="overflow-y-auto flex-1 divide-y" style={{ borderColor: O.lineSoft }}>
            {loading ? (
              <div className="p-8 text-center text-xs font-medium text-stone-400">
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs text-stone-400 font-medium">No templates found in this folder.</p>
                <button
                  onClick={() => activeTab === 'EMAIL' ? setShowEmailTemplateModal(true) : setShowNewModal(true)}
                  className="text-xs font-bold hover:underline"
                  style={{ color: O.deep }}
                >
                  + Create your first template
                </button>
              </div>
            ) : (
              filteredTemplates.map(t => {
                const isSelected = selected?._id === t._id;
                const status = t.waStatus || (t.type === 'whatsapp' ? 'APPROVED' : null);

                return (
                  <div
                    key={t._id}
                    onClick={() => setSelected(t)}
                    className="p-3.5 cursor-pointer transition-all border-l-4 group"
                    style={{
                      borderColor: isSelected ? O.deep : 'transparent',
                      background: isSelected ? O.bgSoft : '#ffffff',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="font-bold text-xs px-2 py-0.5 rounded-md font-mono"
                          style={{
                            background: isSelected ? '#ffffff' : O.bgSofter,
                            color: O.deep,
                            border: `1px solid ${O.line}`
                          }}
                        >
                          /{t.shortcut}
                        </span>
                        {t.isShared && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.2 rounded inline-flex items-center gap-0.5"
                            style={{ background: '#eff6ff', color: '#2563eb' }}
                            title="Shared with team"
                          >
                            <FiUsers className="w-2.5 h-2.5" /> Shared
                          </span>
                        )}
                      </div>

                      {status && t.type === 'whatsapp' && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize whitespace-nowrap"
                          style={{
                            background: status === 'APPROVED' ? '#ecfdf5' : status === 'PENDING' ? '#fffbeb' : '#fef2f2',
                            color: status === 'APPROVED' ? '#059669' : status === 'PENDING' ? '#d97706' : '#dc2626',
                            border: `1px solid ${status === 'APPROVED' ? '#a7f3d0' : status === 'PENDING' ? '#fde68a' : '#fecaca'}`
                          }}
                        >
                          {status}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {t.bodyFormat === 'html' ? (t.subject || 'Rich email campaign template') : t.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel (Preview & Action Hub) ── */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-stone-50/40 p-4 md:p-6 overflow-y-auto">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-400">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
              >
                <FiMessageSquare className="w-6 h-6" style={{ color: O.deep }} />
              </div>
              <p className="text-sm font-bold text-stone-600">No template selected</p>
              <p className="text-xs text-stone-400 mt-0.5 max-w-xs">
                Pick a template from the list on the left to preview contents, view shortcuts, or copy message text.
              </p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Template Meta Header Bar */}
              <div
                className="p-4 rounded-2xl border bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0"
                style={{ borderColor: O.line }}
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-base font-black" style={{ color: O.ink }}>
                      /{selected.shortcut}
                    </span>
                    {selected.waStatus && selected.type === 'whatsapp' && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: selected.waStatus === 'APPROVED' ? '#ecfdf5' : '#fffbeb',
                          color: selected.waStatus === 'APPROVED' ? '#059669' : '#d97706',
                          border: `1px solid ${selected.waStatus === 'APPROVED' ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {selected.waStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    Author: <strong className="text-stone-700">{selected.createdBy?.name || 'You'}</strong> · Visibility: {selected.isShared ? 'Shared with entire team' : 'Private to you'}
                  </p>
                </div>

                {/* Top Actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleCopy(selected)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors shadow-sm"
                    style={{
                      background: copiedId === selected._id ? '#ecfdf5' : '#ffffff',
                      borderColor: copiedId === selected._id ? '#a7f3d0' : O.line,
                      color: copiedId === selected._id ? '#059669' : O.deep
                    }}
                  >
                    {copiedId === selected._id ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                    {copiedId === selected._id ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button
                    onClick={() => handleDelete(selected._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border text-red-600 border-red-200 bg-white hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Template Content Display */}
              {selected.bodyFormat === 'html' ? (
                /* HTML Email Preview Card */
                <div
                  className="flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col"
                  style={{ borderColor: O.line }}
                >
                  <div className="px-5 py-3.5 border-b" style={{ borderColor: O.lineSoft, background: O.bgSofter }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Email Subject</div>
                    <div className="text-sm font-bold mt-0.5" style={{ color: O.ink }}>
                      {selected.subject || '(No subject line specified)'}
                    </div>
                  </div>
                  <div
                    className="flex-1 p-6 text-sm text-stone-700 leading-relaxed overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selected.message }}
                  />
                </div>
              ) : selected.type === 'whatsapp' ? (
                /* WhatsApp Realistic Chat Bubble Preview */
                <div className="flex-1 flex items-center justify-center p-2">
                  <div
                    className="w-full max-w-sm rounded-3xl p-4 shadow-xl border overflow-hidden"
                    style={{
                      background: '#efeae2',
                      borderColor: '#d1c7b7',
                      backgroundImage: `radial-gradient(#dfd6c8 1px, transparent 1px)`,
                      backgroundSize: '16px 16px'
                    }}
                  >
                    {/* Chat Bubble Container */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-200/80">
                      {/* Header Image Banner if exists */}
                      {(selected.headerFormat === 'IMAGE' || selected.headerImage || (selected.components || []).some(c => c.type === 'HEADER' && (c.format === 'IMAGE' || c.example?.header_handle?.length))) && (
                        <div className="w-full h-40 bg-stone-100 overflow-hidden border-b border-stone-200">
                          <img
                            src={selected.headerImage || (selected.components || []).find(c => c.type === 'HEADER')?.example?.header_handle?.[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                            alt="Template Header"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                        </div>
                      )}

                      {/* Header Text */}
                      {(selected.headerText || (selected.components || []).find(c => c.type === 'HEADER')?.text) && (
                        <div className="p-3.5 pb-1 font-bold text-sm text-stone-900">
                          {selected.headerText || (selected.components || []).find(c => c.type === 'HEADER')?.text}
                        </div>
                      )}

                      {/* Message Body */}
                      <div className="p-3.5 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                        {selected.message}
                      </div>

                      {/* Footer */}
                      {(selected.footer || (selected.components || []).find(c => c.type === 'FOOTER')?.text) && (
                        <div className="px-3.5 pb-2 text-[11px] text-stone-400">
                          {selected.footer || (selected.components || []).find(c => c.type === 'FOOTER')?.text}
                        </div>
                      )}

                      {/* Timestamp & Double Checkmarks */}
                      <div className="px-3 pb-2 text-right text-[10px] text-stone-400 flex items-center justify-end gap-1">
                        <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-blue-500 font-bold">✓✓</span>
                      </div>

                      {/* Quick Action Buttons */}
                      {((selected.buttons?.length > 0) || (selected.components || []).find(c => c.type === 'BUTTONS')?.buttons?.length > 0) && (
                        <div className="border-t border-stone-100 divide-y divide-stone-100">
                          {(selected.buttons?.length ? selected.buttons : (selected.components || []).find(c => c.type === 'BUTTONS')?.buttons || []).map((b, i) => (
                            <div key={i} className="py-2 px-3 text-center text-xs font-bold text-blue-600 hover:bg-stone-50 cursor-pointer">
                              {b.text || b.type}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Plain Text Message Preview Card */
                <div
                  className="flex-1 rounded-2xl border bg-white p-6 text-sm text-stone-800 leading-relaxed shadow-sm whitespace-pre-wrap"
                  style={{ borderColor: O.line }}
                >
                  {selected.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── New Template Modal (WhatsApp) ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border"
            style={{ borderColor: O.line }}
          >
            <div style={{ height: 5, background: `linear-gradient(90deg, ${O.primary} 0%, ${O.deep} 100%)` }} />

            <div className="p-6">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: O.lineSoft }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: O.bgSoft, border: `1px solid ${O.line}` }}
                  >
                    <RiWhatsappLine className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: O.ink }}>
                      New WhatsApp Template
                    </h3>
                    <p className="text-xs text-stone-500">Fast response template for telecallers</p>
                  </div>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Shortcut Slash Command (no spaces)
                  </label>
                  <div className="flex items-center rounded-xl border bg-stone-50 px-3 focus-within:bg-white" style={{ borderColor: O.line }}>
                    <span className="font-bold text-stone-400 text-sm">/</span>
                    <input
                      type="text"
                      placeholder="e.g. intro or brochure"
                      value={newTemplate.shortcut}
                      onChange={e => setNewTemplate({ ...newTemplate, shortcut: e.target.value.replace(/[\s\/]/g, '') })}
                      className="w-full py-2.5 px-1 text-xs font-bold bg-transparent focus:outline-none"
                      style={{ color: O.ink }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Message Body Text
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Hello {{NAME}}, thank you for contacting us regarding our courses..."
                    value={newTemplate.message}
                    onChange={e => setNewTemplate({ ...newTemplate, message: e.target.value })}
                    className="w-full p-3 rounded-xl border text-xs bg-stone-50/70 focus:bg-white focus:outline-none transition-all resize-y"
                    style={{ borderColor: O.line }}
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-stone-700 select-none">
                  <input
                    type="checkbox"
                    checked={newTemplate.isShared}
                    onChange={e => setNewTemplate({ ...newTemplate, isShared: e.target.checked })}
                    className="rounded"
                  />
                  <span>Share this template with all team members</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: O.lineSoft }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-50"
                  style={{ borderColor: O.line }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newTemplate.shortcut || !newTemplate.message}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${O.primary} 0%, ${O.deep} 100%)` }}
                >
                  Save Template
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Email Modals */}
      {showEmailTemplateModal && (
        <EmailTemplateModal
          onClose={() => setShowEmailTemplateModal(false)}
          onSaved={handleEmailTemplateSaved}
        />
      )}

      {showEmailCampaignWizard && (
        <EmailCampaignWizard
          initialData={wizardInitialData}
          onClose={() => { setShowEmailCampaignWizard(false); setWizardInitialData(null); }}
        />
      )}

      {showEmailHistory && (
        <EmailCampaignHistory
          onClose={() => setShowEmailHistory(false)}
          onReuse={handleReuseFromHistory}
        />
      )}
    </div>
  );
}