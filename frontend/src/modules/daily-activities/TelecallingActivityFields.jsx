import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  UserCheck,
  CalendarClock,
  Trophy,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
  Minus,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Interested',
  'Follow-up Required',
  'Not Interested',
  'No Answer',
  'Wrong Number',
  'Converted',
  'Call Back Requested',
  'Other',
];

export default function TelecallingActivityFields({
  metrics = {},
  outcomes = [],
  onChangeMetrics,
  onChangeOutcomes,
  disabled = false,
}) {
  const {
    callsAttempted = 0,
    connectedCalls = 0,
    unansweredCalls = 0,
    interestedLeads = 0,
    followUpsScheduled = 0,
    conversions = 0,
  } = metrics;

  const handleMetricChange = (field, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    onChangeMetrics({
      ...metrics,
      [field]: num,
    });
  };

  const handleStep = (field, delta) => {
    if (disabled) return;
    const current = Number(metrics[field]) || 0;
    const nextVal = Math.max(0, current + delta);
    onChangeMetrics({
      ...metrics,
      [field]: nextVal,
    });
  };

  const handleAddOutcome = () => {
    onChangeOutcomes([
      ...outcomes,
      {
        leadName: '',
        category: 'Interested',
        followUpAt: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveOutcome = (idx) => {
    const updated = [...outcomes];
    updated.splice(idx, 1);
    onChangeOutcomes(updated);
  };

  const handleOutcomeChange = (idx, field, val) => {
    const updated = [...outcomes];
    updated[idx] = {
      ...updated[idx],
      [field]: val,
    };
    onChangeOutcomes(updated);
  };

  const hasMismatch = Number(connectedCalls) > Number(callsAttempted);
  const hasLeadMismatch = Number(interestedLeads) > Number(connectedCalls);

  // Conversion calculations
  const connectionRate =
    Number(callsAttempted) > 0
      ? Math.round((Number(connectedCalls) / Number(callsAttempted)) * 100)
      : 0;

  const conversionRate =
    Number(connectedCalls) > 0
      ? Math.round((Number(conversions) / Number(connectedCalls)) * 100)
      : 0;

  const metricCards = [
    {
      key: 'callsAttempted',
      label: 'Attempted Calls',
      short: 'Attempted',
      value: callsAttempted,
      icon: Phone,
      color: 'text-sky-600',
      bg: 'bg-sky-50/70',
      border: 'border-sky-200/80',
    },
    {
      key: 'connectedCalls',
      label: 'Connected Calls',
      short: 'Connected',
      value: connectedCalls,
      icon: PhoneCall,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
    },
    {
      key: 'unansweredCalls',
      label: 'Unanswered / Busy',
      short: 'Unanswered',
      value: unansweredCalls,
      icon: PhoneOff,
      color: 'text-rose-600',
      bg: 'bg-rose-50/70',
      border: 'border-rose-200/80',
    },
    {
      key: 'interestedLeads',
      label: 'Interested Leads',
      short: 'Interested',
      value: interestedLeads,
      icon: UserCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/70',
      border: 'border-indigo-200/80',
    },
    {
      key: 'followUpsScheduled',
      label: 'Follow-ups Set',
      short: 'Callbacks',
      value: followUpsScheduled,
      icon: CalendarClock,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200/80',
    },
    {
      key: 'conversions',
      label: 'Confirmed Closures',
      short: 'Conversions',
      value: conversions,
      icon: Trophy,
      color: 'text-purple-600',
      bg: 'bg-purple-50/70',
      border: 'border-purple-200/80',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Live Telemetry Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="p-1 rounded-lg bg-sky-100 text-sky-700">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <span>Calling Metrics</span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Log outbound and inbound figures for this date.
          </p>
        </div>

        {/* Live calculated rates badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
            <span>Connect Rate:</span>
            <span className="text-sky-950 font-black">{connectionRate}%</span>
          </div>

          <div className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-purple-600" />
            <span>Closure Rate:</span>
            <span className="text-purple-950 font-black">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* Validation Mismatch Banners */}
      <AnimatePresence>
        {hasMismatch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>
              Connected calls ({connectedCalls}) cannot exceed total calls attempted ({callsAttempted}).
            </span>
          </motion.div>
        )}

        {hasLeadMismatch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Interested leads ({interestedLeads}) exceeds connected calls ({connectedCalls}).
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. KPI Metrics Cards Grid — Clean and Neat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`p-3 rounded-2xl border ${card.border} ${card.bg} flex flex-col justify-between gap-2 shadow-2xs transition-colors`}
            >
              {/* Card Label and Icon */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 truncate">
                  {card.short}
                </span>
                <span className={`p-1 rounded-lg bg-white/90 ${card.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Main Number Input */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  min="0"
                  disabled={disabled}
                  value={card.value === 0 ? '' : card.value}
                  onChange={(e) => handleMetricChange(card.key, e.target.value)}
                  placeholder=""
                  title={card.label}
                  className="w-full text-center text-lg sm:text-xl font-black text-slate-900 bg-white border border-slate-200 rounded-xl py-1 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition text-slate-800"
                />
              </div>

              {/* Quick Stepper Buttons — Clean and Flat */}
              {!disabled && (
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleStep(card.key, -1)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                    title="Decrease"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(card.key, 1)}
                    className="flex-1 py-1 bg-white hover:bg-slate-100 text-sky-700 rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                    title="Increase"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Lead Call Outcomes & Scheduled Follow-ups */}
      <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Client Conversations & Follow-ups</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                {outcomes.length}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Record standout prospects, callbacks, or course admissions.
            </p>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleAddOutcome}
              className="px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-2xs hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Client Outcome</span>
            </button>
          )}
        </div>

        {/* List of Outcomes */}
        {outcomes.length === 0 ? (
          <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <p className="text-xs font-medium text-slate-500">
              No specific client interactions recorded yet for this date.
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddOutcome}
                className="mt-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 cursor-pointer transition-colors"
              >
                + Log Client Conversation
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {outcomes.map((outcome, idx) => {
                const isFollowUpReq = outcome.category === 'Follow-up Required';

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col gap-3 relative"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                      {/* Lead Name */}
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Client / Contact #{idx + 1}
                        </label>
                        <input
                          type="text"
                          disabled={disabled}
                          value={outcome.leadName || ''}
                          onChange={(e) => handleOutcomeChange(idx, 'leadName', e.target.value)}
                          placeholder="Client name or contact"
                          className="w-full text-xs font-semibold bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-200 transition"
                        />
                      </div>

                      {/* Category Dropdown */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Call Disposition
                        </label>
                        <select
                          disabled={disabled}
                          value={outcome.category || 'Interested'}
                          onChange={(e) => handleOutcomeChange(idx, 'category', e.target.value)}
                          className="w-full text-xs font-semibold bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-200 transition cursor-pointer"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Next Follow-up Date/Time */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Next Callback {isFollowUpReq && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="datetime-local"
                          disabled={disabled}
                          value={outcome.followUpAt ? outcome.followUpAt.slice(0, 16) : ''}
                          onChange={(e) => handleOutcomeChange(idx, 'followUpAt', e.target.value)}
                          className={`w-full text-xs font-medium bg-slate-50/60 border rounded-xl px-2.5 py-2 focus:outline-none focus:bg-white transition ${
                            isFollowUpReq && !outcome.followUpAt
                              ? 'border-rose-400 bg-rose-50/40 text-rose-800 focus:border-rose-500'
                              : 'border-slate-200 text-slate-800 focus:border-sky-500'
                          }`}
                        />
                      </div>

                      {/* Delete button */}
                      {!disabled && (
                        <div className="sm:col-span-1 flex justify-end sm:pt-6">
                          <button
                            type="button"
                            onClick={() => handleRemoveOutcome(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Remove Outcome"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notes / Conversation Remarks */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Discussion Notes
                      </label>
                      <input
                        type="text"
                        disabled={disabled}
                        value={outcome.notes || ''}
                        onChange={(e) => handleOutcomeChange(idx, 'notes', e.target.value)}
                        placeholder="Call notes"
                        className="w-full text-xs bg-slate-50/60 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-200 transition"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
