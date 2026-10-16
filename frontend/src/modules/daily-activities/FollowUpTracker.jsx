import React, { useState } from 'react';
import { PhoneForwarded, Phone, Clock, Plus, ExternalLink, Calendar } from 'lucide-react';

export default function FollowUpTracker({
  followUps = [],
  directLeads = [],
  loading = false,
  onLogFollowUp,
}) {
  const [activeTab, setActiveTab] = useState('dueToday'); // 'dueToday' | 'upcoming'

  const todayStr = new Date().toISOString().slice(0, 10);

  // Combine follow-ups and leads with scheduled callbacks
  const allItems = [
    ...followUps.map((f) => ({ ...f, type: 'followUp' })),
    ...directLeads.map((l) => ({ ...l, type: 'lead' })),
  ];

  const dueTodayItems = allItems.filter((it) => it.dueDate === todayStr || !it.dueDate);
  const upcomingItems = allItems.filter((it) => it.dueDate && it.dueDate > todayStr);

  const displayedItems = activeTab === 'dueToday' ? dueTodayItems : upcomingItems;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <PhoneForwarded className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">Follow-up Call Tracker</h3>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('dueToday')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'dueToday'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Due Today ({dueTodayItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-2.5 py-1 rounded-lg transition ${
                activeTab === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Upcoming ({upcomingItems.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {activeTab === 'dueToday'
              ? 'No call follow-ups due today.'
              : 'No upcoming scheduled call follow-ups.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {displayedItems.map((item, idx) => (
              <div
                key={item._id || idx}
                className="p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs truncate">
                      {item.leadName || 'Contact Lead'}
                    </span>
                    {item.dueTime && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{item.dueTime}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {item.phone && (
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        <span>{item.phone}</span>
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{item.dueDate}</span>
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-slate-600 truncate mt-1 max-w-sm">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Log Outcome action */}
                <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                  {onLogFollowUp && (
                    <button
                      type="button"
                      onClick={() => onLogFollowUp(item)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1"
                      title="Add to daily activity outcomes"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Log Call</span>
                    </button>
                  )}
                  {item.leadId && (
                    <a
                      href={`/leads/${item.leadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-sky-600 rounded-lg transition"
                      title="View Lead Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
