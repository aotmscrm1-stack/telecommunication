import React, { useState, useEffect } from 'react';
import {
  FaXmark,
  FaTriangleExclamation,
  FaCheck,
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaCalendarDays,
  FaIdBadge
} from 'react-icons/fa6';
import { dailyActivityScheduleAPI } from '../../../services/api';

export default function StagingReviewModal({
  isOpen,
  onClose,
  stagingItem,
  allEmployees = [],
  onConfirmed = () => {}
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [hoursNote, setHoursNote] = useState('');
  const [keyResponsibilities, setKeyResponsibilities] = useState([]);
  const [regularActivities, setRegularActivities] = useState([]);
  const [weeklyResponsibilities, setWeeklyResponsibilities] = useState([]);
  const [recurringMeetings, setRecurringMeetings] = useState([]);
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [hrConfirmationNote, setHrConfirmationNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stagingItem) {
      setSelectedEmployeeId(stagingItem.candidateUser?.id || '');
      const s = stagingItem.scheduleData || {};
      setLoginTime(s.workingHours?.loginTime || '');
      setLogoutTime(s.workingHours?.logoutTime || '');
      setHoursNote(s.workingHours?.note || '');
      setKeyResponsibilities(Array.isArray(s.keyResponsibilities) ? [...s.keyResponsibilities] : []);
      setRegularActivities(Array.isArray(s.regularActivities) ? [...s.regularActivities] : []);
      setWeeklyResponsibilities(Array.isArray(s.weeklyResponsibilities) ? [...s.weeklyResponsibilities] : []);
      setRecurringMeetings(Array.isArray(s.recurringMeetings) ? JSON.parse(JSON.stringify(s.recurringMeetings)) : []);
      setAdditionalInformation(s.additionalInformation || '');
      setHrConfirmationNote(`Confirmed by HR from staged profile (${stagingItem.sourceName})`);
      setError('');
    }
  }, [stagingItem, isOpen]);

  if (!isOpen || !stagingItem) return null;

  const candidate = stagingItem.candidateUser || {};

  const handleConfirm = async () => {
    if (!selectedEmployeeId) {
      setError('Please select or verify the target employee in the database.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await dailyActivityScheduleAPI.confirmStaging(stagingItem.key, {
        employeeId: selectedEmployeeId,
        workingHours: {
          loginTime,
          logoutTime,
          note: hoursNote
        },
        keyResponsibilities,
        regularActivities,
        weeklyResponsibilities,
        recurringMeetings,
        additionalInformation,
        publishStatus: 'published',
        hrConfirmationNote
      });

      onConfirmed();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to confirm schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <FaTriangleExclamation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">HR Verification & Confirmation</h2>
              <p className="text-xs text-amber-800 font-medium">
                Review profile for <strong>{stagingItem.sourceName}</strong> before publishing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Discrepancy Alert */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <FaTriangleExclamation />
              Discrepancy Details (Why HR verification is required)
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              {stagingItem.discrepancyNote}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 text-xs text-amber-950">
              <div>
                <span className="block text-[10px] uppercase font-bold text-amber-700">Source Brief Provided</span>
                <strong>Name:</strong> {stagingItem.sourceName} <br />
                <strong>Designation:</strong> {stagingItem.sourceDesignation} <br />
                <strong>ID:</strong> {stagingItem.sourceEmployeeId}
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-amber-700">Database Candidate Match</span>
                <strong>Name:</strong> {candidate.name || 'N/A'} <br />
                <strong>Designation:</strong> {candidate.designation || 'N/A'} <br />
                <strong>ID:</strong> {candidate.employeeId || 'N/A'} ({candidate.email || 'N/A'})
              </div>
            </div>
          </div>

          {/* Confirm or Re-assign Employee */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Confirm Database Employee Account *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="">-- Select matched employee --</option>
              {allEmployees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.employeeId || 'ID N/A'}) — {emp.designation || 'Staff'} [{emp.department || 'General'}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Select the existing employee in MongoDB to link this schedule to.
            </p>
          </div>

          {/* Working Hours Review */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaClock className="text-sky-500" />
              Working Hours
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Login Time</label>
                <input
                  type="text"
                  value={loginTime}
                  onChange={e => setLoginTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Logout Time</label>
                <input
                  type="text"
                  value={logoutTime}
                  onChange={e => setLogoutTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Timing Notes</label>
                <input
                  type="text"
                  value={hoursNote}
                  onChange={e => setHoursNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Responsibilities Preview */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaBriefcase className="text-amber-500" />
              Key Responsibilities ({keyResponsibilities.length})
            </h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
              <ul className="space-y-1.5 text-xs text-slate-700">
                {keyResponsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Regular Activities Preview */}
          {regularActivities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaUserCheck className="text-emerald-500" />
                Regular Activities ({regularActivities.length})
              </h3>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {regularActivities.map((act, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recurring Meetings Preview */}
          {recurringMeetings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarDays className="text-violet-500" />
                Recurring Meetings ({recurringMeetings.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recurringMeetings.map((mt, i) => (
                  <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{mt.title}</span>
                      <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                        {mt.time}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Days: {(mt.days || []).join(', ')}
                    </div>
                    {mt.description && (
                      <p className="text-[11px] text-slate-500 italic">{mt.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HR Confirmation Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              HR Confirmation Note
            </label>
            <input
              type="text"
              value={hrConfirmationNote}
              onChange={e => setHrConfirmationNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FaCheck className="w-3.5 h-3.5" />
            <span>{saving ? 'Confirming...' : 'Confirm & Create Schedule'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

