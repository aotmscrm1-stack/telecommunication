import React from 'react';

export default function CalendarStatusLegend() {
  const legendItems = [
    {
      label: 'Submitted / Reviewed',
      color: 'bg-emerald-500',
      border: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    },
    {
      label: 'Draft Saved',
      color: 'bg-amber-400',
      border: 'border-amber-200 bg-amber-50/60 text-amber-900',
    },
    {
      label: 'Needs Correction',
      color: 'bg-rose-500',
      border: 'border-rose-200 bg-rose-50/60 text-rose-900',
    },
    {
      label: 'No Activity Log',
      color: 'bg-slate-300',
      border: 'border-slate-200 bg-slate-50 text-slate-600',
    },
  ];

  return (
    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Activity Status Indicator
        </span>
        <span className="text-[10px] text-slate-400">Color coded</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {legendItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-medium ${item.border}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.color}`} />
            <div className="font-semibold truncate leading-tight">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
