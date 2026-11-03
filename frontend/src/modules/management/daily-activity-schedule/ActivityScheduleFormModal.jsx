import React, { useState, useEffect } from 'react';
import {
  FaXmark,
  FaPlus,
  FaTrash,
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaCalendarDays,
  FaCircleInfo,
  FaFloppyDisk
} from 'react-icons/fa6';
import { dailyActivityScheduleAPI } from '../../../services/api';

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Daily', 'Every 2 Days'];

export default function ActivityScheduleFormModal({
  isOpen,
  onClose,
  initialData = null,
  allEmployees = [],
  onSaved = () => {}
}) {
  const isEdit = Boolean(initialData && initialData._id);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [logoutTime, setLogoutTime] = useState('');
  const [workingHoursNote, setWorkingHoursNote] = useState('');
  
  const [keyResponsibilities, setKeyResponsibilities] = useState([]);
  const [newResp, setNewResp] = useState('');

  const [regularActivities, setRegularActivities] = useState([]);
  const [newAct, setNewAct] = useState('');

  const [weeklyResponsibilities, setWeeklyResponsibilities] = useState([]);
  const [newWeekly, setNewWeekly] = useState('');

  const [recurringMeetings, setRecurringMeetings] = useState([]);
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [publishStatus, setPublishStatus] = useState('published');
  const [auditSummary, setAuditSummary] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setSelectedEmployeeId(initialData.employee?._id || initialData.employee || '');
      setLoginTime(initialData.workingHours?.loginTime || '');
      setLogoutTime(initialData.workingHours?.logoutTime || '');
      setWorkingHoursNote(initialData.workingHours?.note || '');
      setKeyResponsibilities(Array.isArray(initialData.keyResponsibilities) ? [...initialData.keyResponsibilities] : []);
      setRegularActivities(Array.isArray(initialData.regularActivities) ? [...initialData.regularActivities] : []);
      setWeeklyResponsibilities(Array.isArray(initialData.weeklyResponsibilities) ? [...initialData.weeklyResponsibilities] : []);
      setRecurringMeetings(Array.isArray(initialData.recurringMeetings) ? JSON.parse(JSON.stringify(initialData.recurringMeetings)) : []);
      setAdditionalInformation(initialData.additionalInformation || '');
      setPublishStatus(initialData.publishStatus || 'published');
      setAuditSummary('');
    } else {
      setSelectedEmployeeId('');
      setLoginTime('09:30 AM');
      setLogoutTime('06:30 PM');
      setWorkingHoursNote('');
      setKeyResponsibilities([]);
      setRegularActivities([]);
      setWeeklyResponsibilities([]);
      setRecurringMeetings([]);
      setAdditionalInformation('');
      setPublishStatus('published');
      setAuditSummary('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Add Item Helpers
  const addResponsibility = () => {
    if (!newResp.trim()) return;
    setKeyResponsibilities([...keyResponsibilities, newResp.trim()]);
    setNewResp('');
  };

  const removeResponsibility = (idx) => {
    setKeyResponsibilities(keyResponsibilities.filter((_, i) => i !== idx));
  };

  const addRegularActivity = () => {
    if (!newAct.trim()) return;
    setRegularActivities([...regularActivities, newAct.trim()]);
    setNewAct('');
  };

  const removeRegularActivity = (idx) => {
    setRegularActivities(regularActivities.filter((_, i) => i !== idx));
  };

  const addWeeklyResp = () => {
    if (!newWeekly.trim()) return;
    setWeeklyResponsibilities([...weeklyResponsibilities, newWeekly.trim()]);
    setNewWeekly('');
  };

  const removeWeeklyResp = (idx) => {
    setWeeklyResponsibilities(weeklyResponsibilities.filter((_, i) => i !== idx));
  };

  // Meeting Handlers
  const addMeeting = () => {
    setRecurringMeetings([
      ...recurringMeetings,
      { title: '', days: ['Monday'], time: '10:30 AM', description: '' }
    ]);
  };

  const updateMeeting = (index, field, value) => {
    const updated = [...recurringMeetings];
    updated[index][field] = value;
    setRecurringMeetings(updated);
  };

  const toggleMeetingDay = (meetingIdx, day) => {
    const updated = [...recurringMeetings];
    const curDays = updated[meetingIdx].days || [];
    if (curDays.includes(day)) {
      updated[meetingIdx].days = curDays.filter(d => d !== day);
    } else {
      updated[meetingIdx].days = [...curDays, day];
    }
    setRecurringMeetings(updated);
  };

  const removeMeeting = (index) => {
    setRecurringMeetings(recurringMeetings.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isEdit && !selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      employee: selectedEmployeeId,
      workingHours: {
        loginTime: loginTime.trim(),
        logoutTime: logoutTime.trim(),
        note: workingHoursNote.trim()
      },
      keyResponsibilities,
      regularActivities,
      weeklyResponsibilities,
      recurringMeetings: recurringMeetings.map(m => ({
        title: m.title.trim(),
        days: m.days.length > 0 ? m.days : ['Monday'],
        time: m.time.trim(),
        description: m.description ? m.description.trim() : ''
      })).filter(m => m.title),
      additionalInformation: additionalInformation.trim(),
      publishStatus,
      summary: auditSummary.trim()
    };

    try {
      if (isEdit) {
        await dailyActivityScheduleAPI.update(initialData._id, payload);
      } else {
        await dailyActivityScheduleAPI.create(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? 'Edit Activity Schedule' : 'Create Daily Activity Schedule'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit ? `Updating regular profile for ${initialData?.employee?.name || 'Employee'}` : 'Configure official regular responsibilities and working hours'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <FaXmark className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1. Employee Selection (if Create) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Employee *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
                required
              >
                <option value="">-- Choose an employee --</option>
                {allEmployees.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.employeeId || 'ID N/A'}) — {emp.designation || 'Staff'} [{emp.department || 'General'}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Working Hours */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaClock className="text-sky-500" />
              Working Hours
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Login Time</label>
                <input
                  type="text"
                  placeholder="e.g. 09:30 AM"
                  value={loginTime}
                  onChange={e => setLoginTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Logout Time</label>
                <input
                  type="text"
                  placeholder="e.g. 06:30 PM"
                  value={logoutTime}
                  onChange={e => setLogoutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Hours Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Online class 08:00 AM - 09:15 AM"
                  value={workingHoursNote}
                  onChange={e => setWorkingHoursNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Key Responsibilities */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaBriefcase className="text-amber-500" />
              Key Responsibilities ({keyResponsibilities.length})
            </h3>
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a primary job responsibility and click Add"
                  value={newResp}
                  onChange={e => setNewResp(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addResponsibility(); } }}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={addResponsibility}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {keyResponsibilities.length > 0 && (
                <ul className="space-y-1.5">
                  {keyResponsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                      <span className="font-medium pr-2">• {item}</span>
                      <button
                        type="button"
                        onClick={() => removeResponsibility(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 4. Regular Activities */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaUserCheck className="text-emerald-500" />
              Regular Daily Activities ({regularActivities.length})
            </h3>
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a routine daily activity and click Add"
                  value={newAct}
                  onChange={e => setNewAct(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRegularActivity(); } }}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={addRegularActivity}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {regularActivities.length > 0 && (
                <ul className="space-y-1.5">
                  {regularActivities.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                      <span className="font-medium pr-2">• {item}</span>
                      <button
                        type="button"
                        onClick={() => removeRegularActivity(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 5. Weekly Responsibilities */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaCalendarDays className="text-violet-500" />
              Weekly Responsibilities ({weeklyResponsibilities.length})
            </h3>
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter a weekly responsibility"
                  value={newWeekly}
                  onChange={e => setNewWeekly(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWeeklyResp(); } }}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={addWeeklyResp}
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {weeklyResponsibilities.length > 0 && (
                <ul className="space-y-1.5">
                  {weeklyResponsibilities.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                      <span className="font-medium pr-2">• {item}</span>
                      <button
                        type="button"
                        onClick={() => removeWeeklyResp(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 6. Recurring Meetings Builder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarDays className="text-indigo-500" />
                Recurring Meetings ({recurringMeetings.length})
              </h3>
              <button
                type="button"
                onClick={addMeeting}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <FaPlus className="w-3 h-3" />
                <span>Add Meeting</span>
              </button>
            </div>

            <div className="space-y-3">
              {recurringMeetings.length === 0 ? (
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                  No recurring meetings added yet.
                </div>
              ) : (
                recurringMeetings.map((mt, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="Meeting Title (e.g. Development Team Meeting)"
                        value={mt.title}
                        onChange={e => updateMeeting(idx, 'title', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="text"
                        placeholder="Time (e.g. 10:30 AM)"
                        value={mt.time}
                        onChange={e => updateMeeting(idx, 'time', e.target.value)}
                        className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeMeeting(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove Meeting"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Days Selection */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Days of Week
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {DAY_OPTIONS.map(day => {
                          const isSel = (mt.days || []).includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleMeetingDay(idx, day)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                                isSel
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Optional meeting description / purpose"
                      value={mt.description || ''}
                      onChange={e => updateMeeting(idx, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 7. Additional Information */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FaCircleInfo className="text-blue-500" />
              Additional Information (HR Notes)
            </h3>
            <textarea
              rows={3}
              placeholder="Enter any additional directives, departmental notes, or reference information..."
              value={additionalInformation}
              onChange={e => setAdditionalInformation(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* 8. Publication Status & Audit Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Publication Status
              </label>
              <select
                value={publishStatus}
                onChange={e => setPublishStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="published">Published (Visible to Employee)</option>
                <option value="draft">Draft (Visible only to HR/MD)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Reason / Revision Summary
              </label>
              <input
                type="text"
                placeholder="e.g. Updated working hours and meeting details"
                value={auditSummary}
                onChange={e => setAuditSummary(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FaFloppyDisk className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : (isEdit ? 'Update Schedule' : 'Create Schedule')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

