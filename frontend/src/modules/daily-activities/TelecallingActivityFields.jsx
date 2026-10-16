import React from 'react';
import { Phone, PhoneCall, PhoneOff, UserCheck, CalendarClock, Trophy, Plus, Trash2, AlertCircle } from 'lucide-react';

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

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Calling Summary Counters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-sky-600" />
            <span>Calling Performance Metrics</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-medium">Log total daily telecalling figures</span>
        </div>

        {hasMismatch && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Connected calls ({connectedCalls}) cannot exceed total calls attempted ({callsAttempted}).</span>
          </div>
        )}

        {hasLeadMismatch && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Interested leads ({interestedLeads}) exceeds connected calls ({connectedCalls}).</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Calls Attempted */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 text-xs font-semibold mb-1">
              <span>Attempted</span>
              <Phone className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={callsAttempted === 0 ? '' : callsAttempted}
              onChange={(e) => handleMetricChange('callsAttempted', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl px-2 py-1 focus:outline-none focus:border-sky-500 w-full"
            />
          </div>

          {/* 2. Connected Calls */}
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
              <span>Connected</span>
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={connectedCalls === 0 ? '' : connectedCalls}
              onChange={(e) => handleMetricChange('connectedCalls', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-emerald-900 bg-white border border-emerald-200 rounded-xl px-2 py-1 focus:outline-none focus:border-emerald-500 w-full"
            />
          </div>

          {/* 3. Unanswered Calls */}
          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
              <span>Unanswered</span>
              <PhoneOff className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={unansweredCalls === 0 ? '' : unansweredCalls}
              onChange={(e) => handleMetricChange('unansweredCalls', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-rose-900 bg-white border border-rose-200 rounded-xl px-2 py-1 focus:outline-none focus:border-rose-500 w-full"
            />
          </div>

          {/* 4. Interested Leads */}
          <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-sky-800 text-xs font-semibold mb-1">
              <span>Interested</span>
              <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={interestedLeads === 0 ? '' : interestedLeads}
              onChange={(e) => handleMetricChange('interestedLeads', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-sky-900 bg-white border border-sky-200 rounded-xl px-2 py-1 focus:outline-none focus:border-sky-500 w-full"
            />
          </div>

          {/* 5. Follow-ups Scheduled */}
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
              <span>Follow-ups</span>
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={followUpsScheduled === 0 ? '' : followUpsScheduled}
              onChange={(e) => handleMetricChange('followUpsScheduled', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-amber-900 bg-white border border-amber-200 rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500 w-full"
            />
          </div>

          {/* 6. Conversions */}
          <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-800 text-xs font-semibold mb-1">
              <span>Conversions</span>
              <Trophy className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={conversions === 0 ? '' : conversions}
              onChange={(e) => handleMetricChange('conversions', e.target.value)}
              placeholder="0"
              className="text-lg font-extrabold text-purple-900 bg-white border border-purple-200 rounded-xl px-2 py-1 focus:outline-none focus:border-purple-500 w-full"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Lead Call Outcomes */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Lead Call Outcomes & Scheduled Follow-ups
            </h4>
            <p className="text-[11px] text-slate-500">Record notable call outcomes and schedule callbacks</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleAddOutcome}
              className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead Outcome</span>
            </button>
          )}
        </div>

        {outcomes.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs">
            No specific lead call outcomes logged for this date.
            {!disabled && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleAddOutcome}
                  className="text-sky-600 font-bold hover:underline"
                >
                  Click here to log a lead conversation
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {outcomes.map((outcome, idx) => {
              const isFollowUpReq = outcome.category === 'Follow-up Required';

              return (
                <div
                  key={idx}
                  className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col gap-3 transition hover:border-slate-300"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                    {/* Lead Name */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Lead Name / Contact #{idx + 1}
                      </label>
                      <input
                        type="text"
                        disabled={disabled}
                        value={outcome.leadName || ''}
                        onChange={(e) => handleOutcomeChange(idx, 'leadName', e.target.value)}
                        placeholder="e.g. Ramesh Chandra (+91 98...)"
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    {/* Category Dropdown */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Outcome Category
                      </label>
                      <select
                        disabled={disabled}
                        value={outcome.category || 'Interested'}
                        onChange={(e) => handleOutcomeChange(idx, 'category', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Next Follow-up Date/Time */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Next Follow-up {isFollowUpReq && <span className="text-rose-500 font-extrabold">*</span>}
                      </label>
                      <input
                        type="datetime-local"
                        disabled={disabled}
                        value={outcome.followUpAt ? outcome.followUpAt.slice(0, 16) : ''}
                        onChange={(e) => handleOutcomeChange(idx, 'followUpAt', e.target.value)}
                        className={`w-full text-xs bg-white border rounded-xl px-2 py-1.5 focus:outline-none font-medium ${
                          isFollowUpReq && !outcome.followUpAt
                            ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                            : 'border-slate-200 focus:border-sky-500'
                        }`}
                      />
                    </div>

                    {/* Delete button */}
                    {!disabled && (
                      <div className="sm:col-span-1 flex justify-end sm:pt-6">
                        <button
                          type="button"
                          onClick={() => handleRemoveOutcome(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Outcome"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes / Conversation Remarks */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Call Discussion Notes / Next Steps
                    </label>
                    <input
                      type="text"
                      disabled={disabled}
                      value={outcome.notes || ''}
                      onChange={(e) => handleOutcomeChange(idx, 'notes', e.target.value)}
                      placeholder="e.g. Interested in AWS course; requested syllabus copy on WhatsApp"
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
