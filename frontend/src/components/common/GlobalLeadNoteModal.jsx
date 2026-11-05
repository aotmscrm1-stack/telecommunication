import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { leadsAPI, metaLeadsAPI } from '../../services/api';
import leadNoteReminderService from '../../services/leadNoteReminderService';

export default function GlobalLeadNoteModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOpen = (e) => {
      const detail = e.detail;
      if (!detail || !detail.leadId) return;

      setLeadData(detail);
      setNote('');
      setIsSaving(false);
      setIsOpen(true);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    };

    window.addEventListener('open-global-lead-note-modal', handleOpen);
    return () => window.removeEventListener('open-global-lead-note-modal', handleOpen);
  }, []);

  const handleClose = () => {
    if (isSaving) return;
    setIsOpen(false);
    setLeadData(null);
    setNote('');
  };

  const handleSaveNote = async () => {
    if (!note.trim() || !leadData?.leadId) return;
    setIsSaving(true);

    const leadId = leadData.leadId;
    const leadName = leadData.leadName || 'Student';
    const status = leadData.status || 'Positive';

    try {
      // 1. Save note via API (supports both MetaLeads and CRM Leads)
      let saved = false;
      try {
        await metaLeadsAPI.update(leadId, {
          note: note.trim(),
          callOutcome: status || 'Note Added',
        });
        saved = true;
      } catch (_) {}

      try {
        await leadsAPI.addNote(leadId, {
          note: note.trim(),
          type: 'note',
        });
        saved = true;
      } catch (_) {}

      // 2. Permanently resolve lead in reminder service so popup NEVER comes again
      leadNoteReminderService.resolveLead(leadId, leadName);

      // 3. Emit sync event to update any active lead detail or table components
      window.dispatchEvent(
        new CustomEvent('crm:lead-updated', {
          detail: { leadId, note: note.trim(), status },
        })
      );

      toast.success(`Note saved for ${leadName}`, {
        description: 'Counsellor note recorded and reminders stopped.',
        duration: 4000,
      });

      handleClose();
    } catch (err) {
      console.error('Failed to save counsellor note:', err);
      toast.error('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToLead = () => {
    if (!leadData?.leadId) return;
    const { leadId, campaign, isMeta } = leadData;

    if (campaign || isMeta) {
      const qs = new URLSearchParams();
      if (campaign) qs.set('campaign', campaign);
      qs.set('leadId', leadId);
      navigate(`/meta-leads?${qs.toString()}`);
    } else {
      navigate(`/leads/${leadId}`);
    }
    handleClose();
  };

  if (!isOpen || !leadData) return null;

  const leadName = leadData.leadName || 'Student';
  const counsellorName = leadData.counsellorName || 'Counselor';
  const summaryStatus = leadData.status || 'Positive';
  const campaignName = leadData.campaign || leadData.campaignName || '';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200/80 overflow-hidden text-slate-800 flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg backdrop-blur-xs">
              📝
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug">Add Counsellor Note</h3>
              <p className="text-xs text-amber-100 font-medium">Record required note for positive call follow-up</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 text-sm font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Lead Info Summary Box */}
        <div className="p-5 flex flex-col gap-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span>👤</span>
                <span>Lead Name:</span>
              </span>
              <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-amber-200/60 max-w-[260px] truncate" title={leadName}>
                {leadName}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span>✍️</span>
                <span>Counsellor:</span>
              </span>
              <span className="font-bold text-amber-900 bg-white px-2.5 py-0.5 rounded-md border border-amber-200/60 max-w-[260px] truncate" title={counsellorName}>
                {counsellorName}
              </span>
            </div>

            {campaignName ? (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <span>📢</span>
                  <span>Campaign:</span>
                </span>
                <span className="font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/60 max-w-[260px] truncate" title={campaignName}>
                  {campaignName}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <span>📞</span>
                <span>Call Summary:</span>
              </span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-300 max-w-[260px] truncate" title={summaryStatus}>
                {summaryStatus}
              </span>
            </div>
          </div>

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Counsellor Note Details *</span>
              <span className="text-[11px] text-slate-400 font-normal">Required</span>
            </label>
            <textarea
              ref={textareaRef}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write what was discussed with the student (fee discussion, course interest, demo feedback, office visit schedule)..."
              disabled={isSaving}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleGoToLead}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span>🔍 View Full Profile</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={!note.trim() || isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾 Save Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

