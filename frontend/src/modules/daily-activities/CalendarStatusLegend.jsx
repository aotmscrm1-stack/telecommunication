import React from 'react';

export default function CalendarStatusLegend() {
  const legendItems = [
    { label: 'Submitted / Reviewed', dotClass: 'bg-emerald-500 shadow-xs shadow-emerald-400/50' },
    { label: 'Draft Saved', dotClass: 'bg-amber-400 shadow-xs shadow-amber-400/50' },
    { label: 'Needs Correction', dotClass: 'bg-orange-500 shadow-xs shadow-orange-500/50' },
    { label: 'No Report Recorded', dotClass: 'bg-slate-300' },
  ];

  return (
    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        Status Legend
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.dotClass}`} />
            <span className="truncate font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
