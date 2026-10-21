import React from 'react';
import { History, Calendar, CheckCircle2, AlertTriangle, Clock, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function ActivityHistoryTable({
  history = [],
  total = 0,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSelectDate,
  loading = false,
  activeDepartment = '',
}) {
  const deptNormalized = String(activeDepartment || '').trim().toLowerCase();
  const isTelecalling = deptNormalized.includes('telecall') || deptNormalized.includes('caller');
  const isDeveloper = deptNormalized.includes('dev');
  const isTrainer = deptNormalized.includes('train');

  const getStatusBadge = (status) => {
    if (status === 'reviewed') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Reviewed
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200">
          Submitted
        </span>
      );
    }
    if (status === 'needs_correction') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
          Correction
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        Draft
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {isDeveloper
                ? 'Developer Activity History'
                : isTelecalling
                ? 'Telecalling Activity History'
                : isTrainer
                ? 'Trainer Activity History'
                : 'My Activity History'}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">{total} Total Logged</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No activity history records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Date</th>
                  {isTelecalling ? (
                    <>
                      <th className="pb-2">Calls (Att / Conn)</th>
                      <th className="pb-2">Outcomes</th>
                    </>
                  ) : isDeveloper ? (
                    <>
                      <th className="pb-2">Project / Module</th>
                      <th className="pb-2">Work Summary / Status</th>
                    </>
                  ) : isTrainer ? (
                    <>
                      <th className="pb-2">Course / Batch</th>
                      <th className="pb-2">Topic & Attendance</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-2">Department</th>
                      <th className="pb-2">Summary / Remarks</th>
                    </>
                  )}
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 font-bold text-slate-800 whitespace-nowrap">
                      {row.activityDate}
                    </td>

                    {isTelecalling ? (
                      <>
                        <td className="py-2.5 text-slate-600 whitespace-nowrap">
                          {row.metrics?.callsAttempted ?? '—'} /{' '}
                          <span className="font-semibold text-emerald-700">
                            {row.metrics?.connectedCalls ?? '—'}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-600 whitespace-nowrap">
                          {row.metrics?.interestedLeads ? (
                            <span className="font-semibold text-sky-700">
                              {row.metrics.interestedLeads} Int.
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </>
                    ) : isDeveloper ? (
                      <>
                        <td className="py-2.5 text-slate-800 font-semibold whitespace-nowrap max-w-[150px] truncate">
                          {row.departmentData?.projectName || '—'}
                        </td>
                        <td className="py-2.5 text-slate-600 max-w-[200px] truncate">
                          {row.departmentData?.workCompleted || row.remarks || '—'}
                        </td>
                      </>
                    ) : isTrainer ? (
                      <>
                        <td className="py-2.5 text-slate-800 font-semibold whitespace-nowrap">
                          {row.departmentData?.courseBatch || '—'}
                        </td>
                        <td className="py-2.5 text-slate-600 max-w-[200px] truncate">
                          {row.departmentData?.sessionTopic || '—'}
                          {row.departmentData?.attendanceCount !== undefined && ` (${row.departmentData.attendanceCount} att)`}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 text-slate-800 font-semibold whitespace-nowrap">
                          {row.department || '—'}
                        </td>
                        <td className="py-2.5 text-slate-600 max-w-[200px] truncate">
                          {row.remarks || 'Report logged'}
                        </td>
                      </>
                    )}

                    <td className="py-2.5 whitespace-nowrap">{getStatusBadge(row.status)}</td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDate(row.activityDate)}
                        className="px-2 py-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                        title="Load date report"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 text-xs text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
