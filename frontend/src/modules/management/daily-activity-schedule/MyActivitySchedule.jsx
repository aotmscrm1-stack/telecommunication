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
  FaFileLines,
  FaPen,
  FaPlus
} from 'react-icons/fa6';
import { CheckCircle2, CircleDotDashed, Circle, Clock, Check, Layers, ChevronRight } from 'lucide-react';
import { dailyActivityScheduleAPI } from '../../../services/api';
import ActivityScheduleFormModal from './ActivityScheduleFormModal';

export default function MyActivitySchedule({ currentUser = null }) {
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

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
      <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full animate-pulse">
        <div className="h-28 bg-slate-200/70 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 bg-slate-200/70 rounded-2xl" />
          <div className="h-20 bg-slate-200/70 rounded-2xl" />
          <div className="h-20 bg-slate-200/70 rounded-2xl" />
        </div>
        <div className="h-40 bg-slate-200/70 rounded-2xl" />
        <div className="h-40 bg-slate-200/70 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-2">
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
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full">
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
      <>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full">
          <div className="p-10 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl font-bold">
              <FaFileLines />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">No Activity Schedule Configured</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
                {message || 'Your official job responsibilities and activity profile have not yet been configured in the system. You can configure your daily activity schedule below.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FaPlus className="w-3.5 h-3.5" />
                <span>Configure My Activity</span>
              </button>
            </div>
          </div>
        </div>

        <ActivityScheduleFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          initialData={currentUser ? { employee: currentUser } : null}
          allEmployees={currentUser ? [currentUser] : []}
          onSaved={() => {
            fetchMySchedule();
            setShowEditModal(false);
          }}
        />
      </>
    );
  }

  const emp = scheduleData.employee || {};
  const workingHours = scheduleData.workingHours || {};
  const keyResponsibilities = scheduleData.keyResponsibilities || [];
  const regularActivities = scheduleData.regularActivities || [];
  const weeklyResponsibilities = scheduleData.weeklyResponsibilities || [];
  const recurringMeetings = scheduleData.recurringMeetings || [];
  const additionalInformation = scheduleData.additionalInformation || '';

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 px-1">
      {/* Section A: Employee Overview Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white shadow-md flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-xl font-bold tracking-wider shadow-inner shrink-0">
            {(emp.name?.charAt(0) || 'E').toUpperCase()}
          </div>
          <div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-sky-200 block mb-0.5">
              Official Reference Profile
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-white">{emp.name || 'My Activity Schedule'}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-sky-100 mt-1 font-medium">
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Edit your activity schedule"
          >
            <FaPen className="w-2.5 h-2.5 text-sky-600" />
            <span>Edit Activity</span>
          </button>
          <div className="px-3 py-1 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 text-[11px] font-semibold text-white">
            Active Schedule
          </div>
        </div>
      </div>

      {/* Section B: Working Hours */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FaClock className="text-sky-500" />
            Working Hours
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">Daily Standard</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100/90">
            <span className="text-[10px] font-bold text-sky-800 uppercase block mb-0.5">Login Time</span>
            <span className="text-sm sm:text-base font-bold text-slate-900">{workingHours.loginTime || '09:30 AM'}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100/90">
            <span className="text-[10px] font-bold text-blue-800 uppercase block mb-0.5">Logout Time</span>
            <span className="text-sm sm:text-base font-bold text-slate-900">{workingHours.logoutTime || '06:30 PM'}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">Schedule Notes</span>
            <span className="text-xs text-slate-700 font-medium leading-relaxed block truncate">
              {workingHours.note || 'Standard full-time daily hours'}
            </span>
          </div>
        </div>
      </div>

      {/* Section C: Key Responsibilities (Order-Wise Agent-Plan Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FaBriefcase className="text-amber-500" />
            1.0 Key Job Responsibilities ({keyResponsibilities.length})
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Core Scope
          </span>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          {keyResponsibilities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center">No specific responsibilities configured.</p>
          ) : (
            <div className="space-y-2">
              {keyResponsibilities.map((item, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-sky-50/40 hover:border-sky-200 transition"
                >
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-600 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
                      1.{idx + 1}
                    </span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {item}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700 shrink-0">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section D: Regular Daily Activities (Order-Wise Timeline Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FaUserCheck className="text-emerald-500" />
            2.0 Regular Daily Activities ({regularActivities.length})
          </h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Daily Sequence
          </span>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          {regularActivities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center">No routine daily activities configured.</p>
          ) : (
            <div className="space-y-2">
              {regularActivities.map((act, idx) => (
                <div
                  key={idx}
                  className="group flex items-start gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/40 hover:border-emerald-200 transition"
                >
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-[11px] font-mono font-bold text-slate-600 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
                      2.{idx + 1}
                    </span>
                    <CircleDotDashed size={16} className="text-sky-500 animate-spin-slow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {act}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                    Routine
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section E: Weekly Responsibilities & Recurring Meetings */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FaCalendarDays className="text-violet-500" />
          3.0 Weekly Focus & Recurring Syncs
        </h2>

        {/* Weekly Focus */}
        {weeklyResponsibilities.length > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Weekly Deliverables & Review Checkpoints
            </span>
            <div className="space-y-1.5">
              {weeklyResponsibilities.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/60 text-xs text-slate-700">
                  <span className="text-[10px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100 shrink-0">
                    3.{idx + 1}
                  </span>
                  <span className="font-medium leading-relaxed">{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meetings Grid */}
        {recurringMeetings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recurringMeetings.map((mt, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-800 truncate">{mt.title}</h3>
                  {mt.time && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 shrink-0">
                      {mt.time}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(mt.days || []).map((day, dIdx) => (
                    <span key={dIdx} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
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

      {additionalInformation && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Additional Guidelines & SOP Notes
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
            {additionalInformation}
          </p>
        </div>
      )}

      {/* Employee Self-Edit Modal (No Delete allowed) */}
      <ActivityScheduleFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={scheduleData}
        allEmployees={currentUser ? [currentUser] : []}
        onSaved={() => {
          fetchMySchedule();
          setShowEditModal(false);
        }}
      />
    </div>
  );
}
