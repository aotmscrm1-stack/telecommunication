import React, { useState, useEffect } from 'react';
import {
  FaClock,
  FaBriefcase,
  FaUserCheck,
  FaCalendarDays,
  FaCircleInfo,
  FaIdBadge,
  FaBuilding,
  FaTriangleExclamation,
  FaFileLines
} from 'react-icons/fa6';
import { dailyActivityScheduleAPI } from '../../../services/api';

export default function MyActivitySchedule() {
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchMySchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dailyActivityScheduleAPI.getMySchedule();
      if (res.data) {
        setScheduleData(res.data.schedule || null);
        setStatus(res.data.status || (res.data.schedule ? 'published' : 'unconfigured'));
        setMessage(res.data.message || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load your activity schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySchedule();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto animate-pulse">
        <div className="h-28 bg-slate-200/70 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200/70 rounded-2xl" />
          <div className="h-24 bg-slate-200/70 rounded-2xl" />
          <div className="h-24 bg-slate-200/70 rounded-2xl" />
        </div>
        <div className="h-44 bg-slate-200/70 rounded-2xl" />
        <div className="h-44 bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-2">
          <div className="font-bold text-sm">Unable to load activity schedule</div>
          <p>{error}</p>
          <button
            onClick={fetchMySchedule}
            className="px-3.5 py-1.5 bg-rose-600 text-white font-semibold rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Case: Draft / Pending HR Review
  if (status === 'draft') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
            <FaTriangleExclamation />
          </div>
          <h2 className="text-base font-bold text-amber-900">Activity Schedule Pending Review</h2>
          <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed font-medium">
            {message || 'Your daily activity schedule is currently in draft and being reviewed by HR. It will appear here once officially published.'}
          </p>
        </div>
      </div>
    );
  }

  // Case: Unconfigured
  if (!scheduleData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-10 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl font-bold">
            <FaFileLines />
          </div>
          <h2 className="text-base font-bold text-slate-800">No Activity Schedule Configured</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {message || 'Your official job responsibilities and activity profile have not yet been configured in the system. Please reach out to HR.'}
          </p>
        </div>
      </div>
    );
  }

  const emp = scheduleData.employee || {};
  const workingHours = scheduleData.workingHours || {};
  const keyResponsibilities = scheduleData.keyResponsibilities || [];
  const regularActivities = scheduleData.regularActivities || [];
  const weeklyResponsibilities = scheduleData.weeklyResponsibilities || [];
  const recurringMeetings = scheduleData.recurringMeetings || [];
  const additionalInformation = scheduleData.additionalInformation || '';

  const formatDateTime = (dt) => {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Section A: Employee Overview Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-2xl font-bold tracking-wider shadow-inner">
            {(emp.name?.charAt(0) || 'E').toUpperCase()}
          </div>
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-200 block mb-0.5">
              Official Employee Reference Profile
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{emp.name || 'My Activity Schedule'}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-sky-100 mt-1 font-medium">
              <span className="flex items-center gap-1 font-bold">
                <FaIdBadge className="text-sky-300" />
                {emp.employeeId || 'ID N/A'}
              </span>
              <span>•</span>
              <span>{emp.designation || 'Staff'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FaBuilding className="text-sky-300" />
                {emp.department || 'General'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-xs font-semibold text-white">
          Active Profile
        </div>
      </div>

      {/* Section B: Working Hours */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FaClock className="text-sky-500" />
          Working Hours
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100">
            <span className="text-[11px] font-semibold text-sky-800 uppercase block mb-0.5">Login Time</span>
            <span className="text-base font-bold text-slate-900">{workingHours.loginTime || '09:30 AM'}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-semibold text-blue-800 uppercase block mb-0.5">Logout Time</span>
            <span className="text-base font-bold text-slate-900">{workingHours.logoutTime || '06:30 PM'}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 uppercase block mb-0.5">Schedule Notes</span>
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              {workingHours.note || 'Standard full-time daily hours'}
            </span>
          </div>
        </div>
      </div>

      {/* Section C: Key Responsibilities */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FaBriefcase className="text-amber-500" />
          Key Job Responsibilities ({keyResponsibilities.length})
        </h2>
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          {keyResponsibilities.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No specific responsibilities configured.</p>
          ) : (
            <ul className="space-y-3">
              {keyResponsibilities.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-xs" />
                  <span className="leading-relaxed font-medium">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section D: Regular Daily Activities */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FaUserCheck className="text-emerald-500" />
          Regular Daily Activities ({regularActivities.length})
        </h2>
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          {regularActivities.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No routine daily activities configured.</p>
          ) : (
            <ul className="space-y-3">
              {regularActivities.map((act, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-xs" />
                  <span className="leading-relaxed font-medium">{act}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section E: Weekly Responsibilities & Recurring Meetings */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FaCalendarDays className="text-violet-500" />
          Weekly Responsibilities & Recurring Meetings
        </h2>

        {/* Weekly Focus */}
        {weeklyResponsibilities.length > 0 && (
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Weekly Focus Areas
            </span>
            <ul className="space-y-2">
              {weeklyResponsibilities.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span className="font-medium leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Meetings Grid */}
        {recurringMeetings.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-center text-xs text-slate-400">
            No recurring meetings scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recurringMeetings.map((mt, idx) => (
              <div key={idx} className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800">{mt.title}</h3>
                  {mt.time && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                      {mt.time}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(mt.days || []).map((day, dIdx) => (
                    <span key={dIdx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {day}
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

      {/* Section F: Additional Information */}
      {additionalInformation && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FaCircleInfo className="text-blue-500" />
            Additional Information & Directives
          </h2>
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
            {additionalInformation}
          </div>
        </div>
      )}

      {/* Section G: Record Metadata */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
        <span>This is your official job scope and recurring schedule reference maintained by HR.</span>
        <span>Last updated: <strong className="text-slate-700">{formatDateTime(scheduleData.updatedAt)}</strong></span>
      </div>
    </div>
  );
}

