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
  Code2,
  Users,
  GraduationCap,
  Building2,
} from 'lucide-react';
import { dailyActivityAPI, usersAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import ActivityCalendar from './ActivityCalendar';
import DepartmentActivityForm from './DepartmentActivityForm';
import ActivityHistoryTable from './ActivityHistoryTable';
import FollowUpTracker from './FollowUpTracker';
import AdminActivityOverview from './AdminActivityOverview';
import { GradientText } from '../../components/ui/GradientText';
import { ShinyText } from '../../components/ui/ShinyText';

const WORKSPACE_DEPARTMENTS = [
  { id: 'Development', label: 'Development', icon: Code2 },
  { id: 'Telecalling', label: 'Telecalling', icon: PhoneCall },
  { id: 'HR', label: 'HR & Management', icon: Users },
  { id: 'Trainer', label: 'Trainer', icon: GraduationCap },
];

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

  const userDept = (user?.department || '').trim();
  const initialDept = canAdmin
    ? (userDept && userDept !== 'Admin' && userDept !== 'Management' ? userDept : 'Development')
    : (userDept || 'Development');

  const [activeDepartment, setActiveDepartment] = useState(initialDept);
  const [activeTab, setActiveTab] = useState('myActivity'); // 'myActivity' | 'adminOverview'

  // Employee Selection & Preview State for Admin
  const [allUsers, setAllUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Fetch all users for Admin employee selection
  useEffect(() => {
    if (!canAdmin) return;
    let isMounted = true;
    usersAPI
      .getAll()
      .then((res) => {
        if (isMounted && res.data?.users) {
          setAllUsers(res.data.users);
        }
      })
      .catch((err) => {
        console.error('Failed to load users for employee picker:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [canAdmin]);

  // Filter employees matching active department
  const deptEmployees = React.useMemo(() => {
    if (!allUsers.length) return [];
    const deptNorm = activeDepartment.toLowerCase();
    return allUsers.filter((u) => {
      const uDept = String(u.department || '').toLowerCase();
      const uRole = String(u.role || '').toLowerCase();
      const uDesig = String(u.designation || '').toLowerCase();

      if (deptNorm.includes('dev')) {
        return (
          uDept.includes('dev') ||
          uRole.includes('dev') ||
          uDesig.includes('dev') ||
          uDesig.includes('engineer') ||
          uRole.includes('engineer')
        );
      }
      if (deptNorm.includes('telecall') || deptNorm.includes('caller')) {
        return (
          uDept.includes('telecall') ||
          uDept.includes('caller') ||
          uRole.includes('caller') ||
          uDesig.includes('councellor') ||
          uDesig.includes('telecall')
        );
      }
      if (deptNorm.includes('hr')) {
        return (
          uDept.includes('hr') ||
          uRole.includes('hr') ||
          uDesig.includes('hr') ||
          uDept.includes('manage')
        );
      }
      if (deptNorm.includes('train')) {
        return (
          uDept.includes('train') ||
          uRole.includes('train') ||
          uDesig.includes('train')
        );
      }
      return uDept.includes(deptNorm);
    });
  }, [allUsers, activeDepartment]);

  // Automatically select the first employee in that department if none is selected
  useEffect(() => {
    if (!canAdmin) return;
    if (deptEmployees.length > 0) {
      const exists = deptEmployees.some((u) => u._id === selectedEmployeeId);
      if (!exists) {
        setSelectedEmployeeId(deptEmployees[0]._id);
      }
    } else {
      setSelectedEmployeeId('');
    }
  }, [deptEmployees, canAdmin]);

  const viewingEmployee = canAdmin
    ? (deptEmployees.find((u) => u._id === selectedEmployeeId) ||
        allUsers.find((u) => u._id === selectedEmployeeId) ||
        null)
    : null;

  // In Admin Mode, viewing employees is strictly a PREVIEW (no Save Draft / Submit)
  const isAdminPreview = Boolean(
    canAdmin && (selectedEmployeeId ? selectedEmployeeId !== user?._id : true)
  );

  const isTelecallingActive =
    activeDepartment.toLowerCase().includes('telecall') ||
    activeDepartment.toLowerCase().includes('caller');

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
  const loadCalendarDots = useCallback(async (month, dept = activeDepartment, empId = selectedEmployeeId) => {
    try {
      const params = { month, department: dept };
      if (empId) params.employeeId = empId;
      const res = await dailyActivityAPI.getCalendar(params);
      if (res.data?.success) {
        setCalendarDays(res.data.days || []);
      }
    } catch (err) {
      console.error('Failed to load calendar markers:', err);
    }
  }, [activeDepartment, selectedEmployeeId]);

  // 2. Fetch Activity for Selected Date
  const loadActivityForDate = useCallback(async (date, dept = activeDepartment, empId = selectedEmployeeId) => {
    try {
      setLoadingActivity(true);
      const params = { date, department: dept };
      if (empId) params.employeeId = empId;
      const res = await dailyActivityAPI.getByDate(params);
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
  }, [activeDepartment, selectedEmployeeId]);

  // 3. Fetch Personal History
  const loadHistory = useCallback(async (page = 1, dept = activeDepartment, empId = selectedEmployeeId) => {
    try {
      setLoadingHistory(true);
      const params = { page, limit: 10, department: dept };
      if (empId) params.employeeId = empId;
      const res = await dailyActivityAPI.getHistory(params);
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
  }, [activeDepartment, selectedEmployeeId]);

  // 4. Fetch Follow-ups
  const loadFollowUps = useCallback(async (dept = activeDepartment) => {
    const isTel = (dept || '').toLowerCase().includes('telecall') || (dept || '').toLowerCase().includes('caller');
    if (!isTel) {
      setFollowUps([]);
      setDirectLeads([]);
      return;
    }
    try {
      setLoadingFollowUps(true);
      const res = await dailyActivityAPI.getFollowUps({ department: dept });
      if (res.data?.success) {
        setFollowUps(res.data.followUps || []);
        setDirectLeads(res.data.directLeads || []);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoadingFollowUps(false);
    }
  }, [activeDepartment]);

  useEffect(() => {
    loadCalendarDots(currentMonth, activeDepartment, selectedEmployeeId);
  }, [currentMonth, activeDepartment, selectedEmployeeId, loadCalendarDots]);

  useEffect(() => {
    loadActivityForDate(selectedDate, activeDepartment, selectedEmployeeId);
  }, [selectedDate, activeDepartment, selectedEmployeeId, loadActivityForDate]);

  useEffect(() => {
    loadHistory(1, activeDepartment, selectedEmployeeId);
    loadFollowUps(activeDepartment);
  }, [activeDepartment, selectedEmployeeId, loadHistory, loadFollowUps]);

  // Department switch handler for Admin / Manager
  const handleDepartmentChange = (newDept) => {
    setActiveDepartment(newDept);
  };

  // Employee switch handler for Admin
  const handleEmployeeChange = (empId) => {
    setSelectedEmployeeId(empId);
    loadActivityForDate(selectedDate, activeDepartment, empId);
    loadCalendarDots(currentMonth, activeDepartment, empId);
    loadHistory(1, activeDepartment, empId);
  };

  // Review Actions for Admin in Preview Mode
  const handleApproveReport = async (reportId) => {
    if (!reportId) return;
    try {
      setReviewLoading(true);
      const res = await dailyActivityAPI.reviewActivity(reportId, { status: 'reviewed' });
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: 'Daily activity report verified and approved successfully!',
        });
        loadActivityForDate(selectedDate, activeDepartment, selectedEmployeeId);
        loadCalendarDots(currentMonth, activeDepartment, selectedEmployeeId);
        loadHistory(historyPage, activeDepartment, selectedEmployeeId);
      } else {
        setNotification({
          type: 'error',
          message: res.data?.message || 'Approval failed.',
        });
      }
    } catch (err) {
      console.error('Approve error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Approval failed.',
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRequestCorrectionReport = async (reportId, reason) => {
    if (!reportId) return;
    try {
      setReviewLoading(true);
      const res = await dailyActivityAPI.reviewActivity(reportId, {
        status: 'needs_correction',
        correctionReason: reason || 'Correction requested by management.',
      });
      if (res.data?.success) {
        setNotification({
          type: 'success',
          message: 'Correction request sent to employee.',
        });
        loadActivityForDate(selectedDate, activeDepartment, selectedEmployeeId);
        loadCalendarDots(currentMonth, activeDepartment, selectedEmployeeId);
        loadHistory(historyPage, activeDepartment, selectedEmployeeId);
      } else {
        setNotification({
          type: 'error',
          message: res.data?.message || 'Correction request failed.',
        });
      }
    } catch (err) {
      console.error('Correction request error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Correction request failed.',
      });
    } finally {
      setReviewLoading(false);
    }
  };

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

      const preparedDeptData = { ...(formData.departmentData || {}) };
      if (activeDepartment.toLowerCase().includes('dev') && !preparedDeptData.status) {
        preparedDeptData.status = 'In Progress';
      }

      const payload = {
        activityDate: selectedDate,
        department: activeDepartment,
        metrics: isTelecallingActive ? formData.metrics : { callsAttempted: 0, connectedCalls: 0, unansweredCalls: 0, interestedLeads: 0, followUpsScheduled: 0, conversions: 0 },
        outcomes: isTelecallingActive ? formData.outcomes : [],
        departmentData: preparedDeptData,
        remarks: formData.remarks,
        nextSteps: formData.nextSteps,
      };

      const res = await dailyActivityAPI.saveDraft(payload);
      if (res.data?.success) {
        setActivity(res.data.activity);
        setIsDirty(false);
        setNotification({
          type: 'success',
          message: `Daily activity draft for ${activeDepartment} saved successfully!`,
        });
        loadCalendarDots(currentMonth, activeDepartment);
        loadHistory(historyPage, activeDepartment);
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

      const preparedDeptData = { ...(formData.departmentData || {}) };
      if (activeDepartment.toLowerCase().includes('dev') && !preparedDeptData.status) {
        preparedDeptData.status = 'In Progress';
      }

      // 1. Ensure report exists as draft first or update it
      const payload = {
        activityDate: selectedDate,
        department: activeDepartment,
        metrics: isTelecallingActive ? formData.metrics : { callsAttempted: 0, connectedCalls: 0, unansweredCalls: 0, interestedLeads: 0, followUpsScheduled: 0, conversions: 0 },
        outcomes: isTelecallingActive ? formData.outcomes : [],
        departmentData: preparedDeptData,
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
        const isUpdate = activity?.status === 'submitted';
        setActivity(submitRes.data.activity);
        setIsDirty(false);
        setNotification({
          type: 'success',
          message: isUpdate
            ? `Daily activity for ${selectedDate} updated successfully!`
            : `Daily activity report for ${activeDepartment} formally submitted for review!`,
        });
        loadCalendarDots(currentMonth, activeDepartment);
        loadHistory(historyPage, activeDepartment);
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
      phone: item.phone || item.leadPhone || '',
      campaign: item.campaign || item.campaignName || '',
      course: item.course || item.courseName || '',
      category: 'Follow-up Required',
      followUpAt: item.dueDate ? `${item.dueDate}T${item.dueTime || '10:00'}` : '',
      notes: item.notes || `Callback with ${item.leadName || 'lead'}`,
    };

    setFormData({
      ...formData,
      outcomes: [...existing, newOutcome],
    });
    setIsDirty(true);
    setNotification({
      type: 'success',
      message: `Lead '${item.leadName || 'Contact'}' added to today's call outcomes. Complete notes and save draft.`,
    });
  };

  const handleSelectDateFromHistory = (date, mode = 'view', row = null) => {
    // 1. If row is provided, immediately populate form with present information from this activity
    if (row) {
      setActivity(row);
      setFormData({
        metrics: row.metrics || {
          callsAttempted: 0,
          connectedCalls: 0,
          unansweredCalls: 0,
          interestedLeads: 0,
          followUpsScheduled: 0,
          conversions: 0,
        },
        outcomes: Array.isArray(row.outcomes) ? row.outcomes : [],
        departmentData: row.departmentData || {},
        remarks: row.remarks || '',
        nextSteps: row.nextSteps || '',
      });
      if (row.department && row.department !== activeDepartment) {
        setActiveDepartment(row.department);
      }
    }

    setSelectedDate(date);

    // 2. Fetch fresh activity from server (covers case when selectedDate was already date)
    loadActivityForDate(date, row?.department || activeDepartment, selectedEmployeeId);

    // 3. Smooth scroll up to the form
    window.scrollTo({ top: 120, behavior: 'smooth' });

    // 4. Feedback notification
    if (mode === 'edit') {
      setNotification({
        type: 'info',
        message: `Activity for ${date} loaded. Present information is ready and can be edited.`,
      });
    } else {
      setNotification({
        type: 'info',
        message: `Activity report for ${date} loaded.`,
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* 1. Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-medium uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            <ShinyText text="AOTMS Performance & Accountability Hub" speed={4} className="text-sky-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <GradientText colors={['#0f172a', '#0369a1', '#0284c7']}>
              Daily Activity Workspace
            </GradientText>
          </h1>
          <p className="text-xs sm:text-sm font-normal text-slate-500 mt-1">
            Plan deliverables, track performance metrics, and submit verified daily activity reports.
          </p>
        </div>

        {/* Tab switch for Admin / Manager */}
        {canAdmin && (
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 shadow-2xs self-stretch sm:self-auto backdrop-blur-sm">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setActiveTab('myActivity')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'myActivity'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>My Workspace</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setActiveTab('adminOverview')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'adminOverview'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Team Overview & Reviews</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Notification Banner with AnimatePresence */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`p-3.5 rounded-xl border text-xs font-normal flex items-center justify-between gap-3 shadow-2xs transition ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : 'bg-rose-50 text-rose-950 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
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
              className="text-slate-400 hover:text-slate-700 text-xs font-normal px-2 py-0.5 rounded-md hover:bg-black/5 transition"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Views */}
      {activeTab === 'adminOverview' && canAdmin ? (
        <AdminActivityOverview />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Department Workspace Switcher for Admin / Management Oversight - Single Clean Line */}
          {canAdmin && (
            <div className="px-3.5 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 overflow-x-auto">
              {/* Left Identity: Icon + Department label + Badges in ONE line */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100 flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                    Department Workspace:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70 font-medium text-[11px] whitespace-nowrap">
                    {activeDepartment}
                  </span>
                  {isAdminPreview && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-normal text-[10px] whitespace-nowrap">
                      Preview Mode
                    </span>
                  )}
                </div>
              </div>

              {/* Right Controls: Department Tabs + Employee Selector in the SAME line */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Department Buttons (Decreased size & clean normal font) */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
                  {WORKSPACE_DEPARTMENTS.map((dept) => {
                    const isCurrent = activeDepartment.toLowerCase() === dept.id.toLowerCase();
                    const Icon = dept.icon;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => handleDepartmentChange(dept.id)}
                        className={`px-2.5 py-1 text-[11px] font-normal rounded-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          isCurrent
                            ? 'bg-sky-600 text-white font-medium shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{dept.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Employee Selector Dropdown (Decreased size & clean font) */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/60 rounded-lg px-2 py-1">
                  <Users className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="text-[11px] font-normal text-slate-500 whitespace-nowrap">Employee:</span>
                  <select
                    value={selectedEmployeeId || ''}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="text-[11px] bg-transparent border-0 text-slate-700 font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
                  >
                    {deptEmployees.length === 0 ? (
                      <option value="">No staff in dept</option>
                    ) : (
                      deptEmployees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} {emp.staffId ? `(${emp.staffId})` : ''}
                        </option>
                      ))
                    )}
                    <option value={user?._id}>My Own Log ({user?.name || 'Me'})</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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
                viewingEmployee={viewingEmployee}
                activeDepartment={activeDepartment}
                isAdminPreview={isAdminPreview}
                loading={loadingActivity}
                saving={saving}
                submitting={submitting}
                reviewLoading={reviewLoading}
                formData={formData}
                setFormData={handleFormDataChange}
                onSaveDraft={handleSaveDraft}
                onSubmitReport={handleSubmitReport}
                onApprove={handleApproveReport}
                onRequestCorrection={handleRequestCorrectionReport}
              />
            </div>
          </div>

          {/* Bottom Grid: History Table & Telecalling Follow-Up Tracker (Telecalling Only) */}
          {isTelecallingActive ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div>
                <ActivityHistoryTable
                  history={history}
                  total={historyTotal}
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(p) => loadHistory(p, activeDepartment, selectedEmployeeId)}
                  onSelectDate={handleSelectDateFromHistory}
                  loading={loadingHistory}
                  activeDepartment={activeDepartment}
                />
              </div>

              <div>
                <FollowUpTracker
                  followUps={followUps}
                  directLeads={directLeads}
                  loading={loadingFollowUps}
                  onLogFollowUp={handleLogFollowUp}
                />
              </div>
            </div>
          ) : (
            <div className="w-full">
              <ActivityHistoryTable
                history={history}
                total={historyTotal}
                page={historyPage}
                totalPages={historyTotalPages}
                onPageChange={(p) => loadHistory(p, activeDepartment, selectedEmployeeId)}
                onSelectDate={handleSelectDateFromHistory}
                loading={loadingHistory}
                activeDepartment={activeDepartment}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
