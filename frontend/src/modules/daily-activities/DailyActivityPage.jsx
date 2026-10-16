import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar as CalendarIcon,
  PhoneCall,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { dailyActivityAPI } from '../../services/api';
import ActivityCalendar from './ActivityCalendar';
import DepartmentActivityForm from './DepartmentActivityForm';
import ActivityHistoryTable from './ActivityHistoryTable';
import FollowUpTracker from './FollowUpTracker';
import AdminActivityOverview from './AdminActivityOverview';

export default function DailyActivityPage() {
  const { user } = useAuth();

  // Role check: Admin, Manager, MD, CEO, HR
  const role = String(user?.role || '').toLowerCase();
  const desig = String(user?.designation || '').toUpperCase();
  const canAdmin =
    role === 'admin' ||
    role === 'manager' ||
    desig === 'MANAGING DIRECTOR' ||
    desig === 'MD' ||
    desig === 'CEO' ||
    desig === 'HR';

  const [activeTab, setActiveTab] = useState('myActivity'); // 'myActivity' | 'adminOverview'

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState(currentMonthStr);
  const [calendarDays, setCalendarDays] = useState([]);

  // Report & Form State
  const [activity, setActivity] = useState(null);
  const [formData, setFormData] = useState({
    metrics: {
      callsAttempted: 0,
      connectedCalls: 0,
      unansweredCalls: 0,
      interestedLeads: 0,
      followUpsScheduled: 0,
      conversions: 0,
    },
    outcomes: [],
    departmentData: {},
    remarks: '',
    nextSteps: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Status Alerts
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  // History & Follow-ups
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [followUps, setFollowUps] = useState([]);
  const [directLeads, setDirectLeads] = useState([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);

  // 1. Fetch Calendar Dots
  const loadCalendarDots = useCallback(async (month) => {
    try {
      const res = await dailyActivityAPI.getCalendar({ month });
      if (res.data?.success) {
        setCalendarDays(res.data.days || []);
      }
    } catch (err) {
      console.error('Failed to load calendar markers:', err);
    }
  }, []);

  // 2. Fetch Activity for Selected Date
  const loadActivityForDate = useCallback(async (date) => {
    try {
      setLoadingActivity(true);
      const res = await dailyActivityAPI.getByDate({ date });
      if (res.data?.success && res.data.activity) {
        const act = res.data.activity;
        setActivity(act);
        setFormData({
          metrics: act.metrics || {
            callsAttempted: 0,
            connectedCalls: 0,
            unansweredCalls: 0,
            interestedLeads: 0,
            followUpsScheduled: 0,
            conversions: 0,
          },
          outcomes: Array.isArray(act.outcomes) ? act.outcomes : [],
          departmentData: act.departmentData || {},
          remarks: act.remarks || '',
          nextSteps: act.nextSteps || '',
        });
      } else {
        setActivity(null);
        setFormData({
          metrics: {
            callsAttempted: 0,
            connectedCalls: 0,
            unansweredCalls: 0,
            interestedLeads: 0,
            followUpsScheduled: 0,
            conversions: 0,
          },
          outcomes: [],
          departmentData: {},
          remarks: '',
          nextSteps: '',
        });
      }
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load daily activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // 3. Fetch Personal History
  const loadHistory = useCallback(async (page = 1) => {
    try {
      setLoadingHistory(true);
      const res = await dailyActivityAPI.getHistory({ page, limit: 10 });
      if (res.data?.success) {
        setHistory(res.data.activities || []);
        setHistoryTotal(res.data.total || 0);
        setHistoryPage(res.data.page || 1);
        setHistoryTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 4. Fetch Follow-ups
  const loadFollowUps = useCallback(async () => {
    try {
      setLoadingFollowUps(true);
      const res = await dailyActivityAPI.getFollowUps();
      if (res.data?.success) {
        setFollowUps(res.data.followUps || []);
        setDirectLeads(res.data.directLeads || []);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoadingFollowUps(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarDots(currentMonth);
  }, [currentMonth, loadCalendarDots]);

  useEffect(() => {
    loadActivityForDate(selectedDate);
  }, [selectedDate, loadActivityForDate]);

  useEffect(() => {
    loadHistory(1);
    loadFollowUps();
  }, [loadHistory, loadFollowUps]);

  // Form Change wrapper
  const handleFormDataChange = (newVal) => {
    setFormData(newVal);
    setIsDirty(true);
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        activityDate: selectedDate,
        department: user?.department || 'Telecalling',
        metrics: formData.metrics,
        outcomes: formData.outcomes,
        departmentData: formData.departmentData,
        remarks: formData.remarks,
        nextSteps: formData.nextSteps,
      };

      const res = await dailyActivityAPI.saveDraft(payload);
      if (res.data?.success) {
        setActivity(res.data.activity);
        setIsDirty(false);
        setNotification({
          type: 'success',
          message: 'Daily activity draft saved successfully!',
        });
        loadCalendarDots(currentMonth);
        loadHistory(historyPage);
      } else {
        setNotification({
          type: 'error',
          message: res.data?.message || 'Failed to save draft.',
        });
      }
    } catch (err) {
      console.error('Draft save error:', err);
      const msg = err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Failed to save draft.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Submit Activity Action
  const handleSubmitReport = async () => {
    try {
      setSubmitting(true);
      setNotification(null);

      // 1. Ensure report exists as draft first or update it
      const payload = {
        activityDate: selectedDate,
        department: user?.department || 'Telecalling',
        metrics: formData.metrics,
        outcomes: formData.outcomes,
        departmentData: formData.departmentData,
        remarks: formData.remarks,
        nextSteps: formData.nextSteps,
      };

      let currentId = activity?._id;
      if (!currentId) {
        const draftRes = await dailyActivityAPI.saveDraft(payload);
        if (!draftRes.data?.success) {
          throw new Error(draftRes.data?.message || 'Could not initialize draft for submission.');
        }
        currentId = draftRes.data.activity._id;
      }

      // 2. Submit report
      const submitRes = await dailyActivityAPI.submitActivity(currentId, payload);
      if (submitRes.data?.success) {
        setActivity(submitRes.data.activity);
        setIsDirty(false);
        setNotification({
          type: 'success',
          message: 'Daily activity formally submitted for review!',
        });
        loadCalendarDots(currentMonth);
        loadHistory(historyPage);
      } else {
        setNotification({
          type: 'error',
          message: submitRes.data?.message || 'Submission failed.',
        });
      }
    } catch (err) {
      console.error('Submit report error:', err);
      const msg = err.response?.data?.errors?.join(', ') || err.response?.data?.message || err.message || 'Submission failed.';
      setNotification({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Add follow-up item to form outcomes
  const handleLogFollowUp = (item) => {
    const existing = formData.outcomes || [];
    const newOutcome = {
      leadName: item.leadName || '',
      category: 'Follow-up Required',
      followUpAt: item.dueDate ? `${item.dueDate}T${item.dueTime || '10:00'}` : '',
      notes: item.notes || `Callback with ${item.leadName}`,
    };

    setFormData({
      ...formData,
      outcomes: [...existing, newOutcome],
    });
    setIsDirty(true);
    setNotification({
      type: 'success',
      message: `Lead '${item.leadName}' added to today's call outcomes. Complete notes and save draft.`,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-extrabold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>AOTMS Performance & Accountability</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Daily Activity & Telecaller Workspace</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily calls, manage scheduled follow-ups, and submit verified activity reports.
          </p>
        </div>

        {/* Tab switch for Admin / Manager */}
        {canAdmin && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('myActivity')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'myActivity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>My Workspace</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('adminOverview')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'adminOverview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Organization Overview & Reviews</span>
            </button>
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs transition ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === 'adminOverview' && canAdmin ? (
        <AdminActivityOverview />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Top Two-Column Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Month Calendar */}
            <div className="lg:col-span-4 xl:col-span-4">
              <ActivityCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                currentMonth={currentMonth}
                onChangeMonth={setCurrentMonth}
                calendarDays={calendarDays}
                loading={loadingActivity}
                isDirty={isDirty}
              />
            </div>

            {/* Right Column: Department Activity Form */}
            <div className="lg:col-span-8 xl:col-span-8">
              <DepartmentActivityForm
                selectedDate={selectedDate}
                activity={activity}
                user={user}
                loading={loadingActivity}
                saving={saving}
                submitting={submitting}
                formData={formData}
                setFormData={handleFormDataChange}
                onSaveDraft={handleSaveDraft}
                onSubmitReport={handleSubmitReport}
              />
            </div>
          </div>

          {/* Bottom Grid: History & Follow-Up Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left: Activity History Table */}
            <div>
              <ActivityHistoryTable
                history={history}
                total={historyTotal}
                page={historyPage}
                totalPages={historyTotalPages}
                onPageChange={(p) => loadHistory(p)}
                onSelectDate={setSelectedDate}
                loading={loadingHistory}
              />
            </div>

            {/* Right: Follow-up Call Tracker */}
            <div>
              <FollowUpTracker
                followUps={followUps}
                directLeads={directLeads}
                loading={loadingFollowUps}
                onLogFollowUp={handleLogFollowUp}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
