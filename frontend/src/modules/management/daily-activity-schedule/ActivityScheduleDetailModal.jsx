import React, { useState } from 'react';
import {
  FaXmark,
  FaClock,
  FaBriefcase,
  FaCalendarDays,
  FaCircleInfo,
  FaPen,
  FaClockRotateLeft,
  FaUserCheck,
  FaBoxArchive,
  FaBuilding,
  FaIdBadge
} from 'react-icons/fa6';
import AuditHistoryDrawer from './AuditHistoryDrawer';

export default function ActivityScheduleDetailModal({
  isOpen,
  onClose,
  schedule,
  canEdit = false,
  onEdit = () => {},
  onArchiveToggle = () => {}
}) {
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  if (!isOpen || !schedule) return null;

  const emp = schedule.employee || {};
  const workingHours = schedule.workingHours || {};
  const keyResponsibilities = schedule.keyResponsibilities || [];
  const regularActivities = schedule.regularActivities || [];
  const weeklyResponsibilities = schedule.weeklyResponsibilities || [];
  const recurringMeetings = schedule.recurringMeetings || [];
  const additionalInformation = schedule.additionalInformation || '';
  const auditHistory = schedule.auditHistory || [];

  const createdByName = schedule.createdBy?.name || 'System Admin';
  const updatedByName = schedule.updatedBy?.name || 'System Admin';

  const formatDateTime = (dt) => {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (st) => {
    if (st === 'published') return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Published</span>;
    if (st === 'draft') return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">Draft / Pending Review</span>;
    if (st === 'archived') return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-300">Archived</span>;
    return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600">Configured</span>;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                {(emp.name?.charAt(0) || 'E').toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">{emp.name || 'Employee Profile'}</h2>
                  {getStatusBadge(schedule.publishStatus)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <FaIdBadge className="text-slate-400" />
                    {emp.employeeId || 'ID N/A'}
                  </span>
                  <span>•</span>
                  <span>{emp.designation || 'Staff'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <FaBuilding className="text-slate-400" />
                    {emp.department || 'General'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAuditDrawer(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer"
                title="View Audit History"
              >
                <FaClockRotateLeft className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">History ({auditHistory.length})</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(schedule);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FaPen className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <FaXmark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Section A: Employee Overview */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Employee Name</span>
                <span className="font-semibold text-slate-800">{emp.name || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Employee ID</span>
                <span className="font-semibold text-slate-800">{emp.employeeId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Department</span>
                <span className="font-semibold text-slate-800">{emp.department || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Designation</span>
                <span className="font-semibold text-slate-800">{emp.designation || '—'}</span>
              </div>
            </div>

            {/* Section B: Working Hours */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaClock className="text-sky-500" />
                Working Hours
              </h3>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Login Time</span>
                  <span className="font-bold text-slate-800 text-sm">{workingHours.loginTime || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Logout Time</span>
                  <span className="font-bold text-slate-800 text-sm">{workingHours.logoutTime || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-medium">Working Hours Note</span>
                  <span className="text-slate-700 font-medium">{workingHours.note || 'Standard working hours'}</span>
                </div>
              </div>
            </div>

            {/* Section C: Key Responsibilities */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaBriefcase className="text-amber-500" />
                Key Responsibilities ({keyResponsibilities.length})
              </h3>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                {keyResponsibilities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No specific responsibilities listed.</p>
                ) : (
                  <ul className="space-y-2 text-xs text-slate-700">
                    {keyResponsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-medium">{resp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Section D: Regular Activities */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaUserCheck className="text-emerald-500" />
                Regular Activities ({regularActivities.length})
              </h3>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                {regularActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No routine daily activities listed.</p>
                ) : (
                  <ul className="space-y-2 text-xs text-slate-700">
                    {regularActivities.map((act, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-medium">{act}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Section E: Weekly Responsibilities & Recurring Meetings */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarDays className="text-violet-500" />
                Weekly Responsibilities & Recurring Meetings
              </h3>
              <div className="space-y-2">
                {/* Weekly Responsibilities */}
                {weeklyResponsibilities.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Weekly Focus Items
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {weeklyResponsibilities.map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                          <span className="font-medium">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recurring Meetings Cards */}
                {recurringMeetings.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs text-slate-400 italic">
                    No recurring meetings scheduled.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {recurringMeetings.map((mt, i) => (
                      <div key={i} className="p-3.5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/50 to-white shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800">{mt.title}</h4>
                          {mt.time && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                              {mt.time}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(mt.days || []).map((d, dIdx) => (
                            <span key={dIdx} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {d}
                            </span>
                          ))}
                        </div>
                        {mt.description && (
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            {mt.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section F: Additional Information */}
            {additionalInformation && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FaCircleInfo className="text-blue-500" />
                  Additional Information
                </h3>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {additionalInformation}
                </div>
              </div>
            )}

            {/* Section G: Record Metadata */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-500">
              <div>
                <span className="block text-slate-400">Created By</span>
                <span className="font-semibold text-slate-700">{createdByName}</span>
              </div>
              <div>
                <span className="block text-slate-400">Created Date</span>
                <span className="font-semibold text-slate-700">{formatDateTime(schedule.createdAt)}</span>
              </div>
              <div>
                <span className="block text-slate-400">Last Updated By</span>
                <span className="font-semibold text-slate-700">{updatedByName}</span>
              </div>
              <div>
                <span className="block text-slate-400">Last Updated Date</span>
                <span className="font-semibold text-slate-700">{formatDateTime(schedule.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            {canEdit ? (
              <button
                type="button"
                onClick={() => onArchiveToggle(schedule)}
                className="text-xs font-semibold text-slate-500 hover:text-amber-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FaBoxArchive className="w-3.5 h-3.5" />
                <span>{schedule.publishStatus === 'archived' ? 'Restore Schedule' : 'Archive Schedule'}</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <AuditHistoryDrawer
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        auditHistory={auditHistory}
        employeeName={emp.name || 'Employee'}
      />
    </>
  );
}

