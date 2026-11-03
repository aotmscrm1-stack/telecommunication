import React from 'react';
import { FaXmark, FaClockRotateLeft, FaUser, FaArrowRight, FaCircleCheck } from 'react-icons/fa6';

export default function AuditHistoryDrawer({ isOpen, onClose, auditHistory = [], employeeName = 'Employee' }) {
  if (!isOpen) return null;

  const sortedHistory = [...auditHistory].reverse();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col transform transition-all duration-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <FaClockRotateLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Audit & Change History</h2>
              <p className="text-xs text-slate-500">Revisions for {employeeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FaClockRotateLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No recorded revisions yet.</p>
            </div>
          ) : (
            sortedHistory.map((entry, idx) => {
              const formattedDate = entry.performedAt
                ? new Date(entry.performedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Date N/A';

              const performerName = entry.performedBy?.name || 'Authorized User';
              const actionColors = {
                created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                updated: 'bg-sky-50 text-sky-700 border-sky-200',
                confirmed: 'bg-violet-50 text-violet-700 border-violet-200',
                published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                archived: 'bg-amber-50 text-amber-700 border-amber-200',
                restored: 'bg-blue-50 text-blue-700 border-blue-200'
              };
              const badgeStyle = actionColors[entry.action] || 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
                      <FaUser />
                    </div>
                    <span>Modified by: <strong className="text-slate-800">{performerName}</strong></span>
                  </div>

                  {entry.summary && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {entry.summary}
                    </p>
                  )}

                  {/* Field changes diff */}
                  {Array.isArray(entry.fieldChanges) && entry.fieldChanges.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Changed Fields ({entry.fieldChanges.length})
                      </p>
                      <div className="space-y-2">
                        {entry.fieldChanges.map((diff, dIdx) => (
                          <div key={dIdx} className="text-xs bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                            <div className="font-semibold text-slate-800 text-[11px] font-mono">
                              {diff.field}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-1.5 rounded-lg bg-rose-50/80 border border-rose-200/70 text-rose-800 overflow-x-auto">
                                <span className="block text-[9px] uppercase font-bold text-rose-500 mb-0.5">Previous</span>
                                <pre className="font-sans whitespace-pre-wrap">{formatDiffValue(diff.previousValue)}</pre>
                              </div>
                              <div className="p-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70 text-emerald-800 overflow-x-auto">
                                <span className="block text-[9px] uppercase font-bold text-emerald-500 mb-0.5">Updated</span>
                                <pre className="font-sans whitespace-pre-wrap">{formatDiffValue(diff.updatedValue)}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDiffValue(val) {
  if (val === undefined || val === null || val === '') return '(empty)';
  if (Array.isArray(val)) {
    if (val.length === 0) return '(empty list)';
    return val.map((item, i) => {
      if (typeof item === 'object') return `${i + 1}. ${item.title || JSON.stringify(item)}`;
      return `• ${item}`;
    }).join('\n');
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

