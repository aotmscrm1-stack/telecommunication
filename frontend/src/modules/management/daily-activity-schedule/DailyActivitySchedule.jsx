import React, { useState, useEffect } from 'react';
import {
  FaCalendarCheck,
  FaUsers,
  FaUser,
  FaShieldHalved,
  FaListCheck,
  FaDiagramProject
} from 'react-icons/fa6';
import { useAuth } from '../../../context/AuthContext';
import {
  canViewAllDailyActivitySchedules,
  canEditDailyActivitySchedule,
  isManagingDirector
} from '../../../utils/permissions';
import { usersAPI } from '../../../services/api';
import AllEmployeeActivities from './AllEmployeeActivities';
import MyActivitySchedule from './MyActivitySchedule';
import Plan from '@/components/ui/agent-plan';

export default function DailyActivitySchedule() {
  const { user } = useAuth();
  const canViewAll = canViewAllDailyActivitySchedules(user);
  const canEdit = canEditDailyActivitySchedule(user);
  const isMD = isManagingDirector(user);

  const [activeTab, setActiveTab] = useState(canViewAll ? 'all' : 'my');
  const [allEmployees, setAllEmployees] = useState([]);

  useEffect(() => {
    if (canViewAll) {
      usersAPI.getAll({ limit: 100 }).then(res => {
        if (res.data?.users) {
          setAllEmployees(res.data.users.filter(u => u.isActive !== false));
        }
      }).catch(err => {
        console.error('Failed to load employee list:', err);
      });
    }
  }, [canViewAll]);

  return (
    <div className="min-h-screen bg-slate-50/60 py-4 sm:py-6 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto w-full space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center text-lg sm:text-xl font-bold shadow-sm shrink-0">
              <FaCalendarCheck />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Daily Activity Schedule
                </h1>
                {canViewAll && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    {canEdit ? 'Admin & Manager' : 'View Only'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official regular responsibilities, working hours, and order-wise activity plans
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs flex-wrap gap-1">
            {canViewAll && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FaUsers className="w-3.5 h-3.5" />
                <span>All Staff</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FaUser className="w-3 h-3" />
              <span>My Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'plan'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FaDiagramProject className="w-3 h-3 text-sky-400" />
              <span>Order-Wise Plan</span>
            </button>
          </div>
        </div>

        {/* Main Tab View */}
        {activeTab === 'all' && canViewAll ? (
          <AllEmployeeActivities
            currentUser={user}
            canEdit={canEdit}
            allEmployees={allEmployees}
          />
        ) : activeTab === 'plan' ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                  Order-Wise Activity Execution Plan
                </h2>
                <p className="text-xs text-slate-500">
                  Step-by-step roadmap with dependencies, real-time status toggles, and subtask tooling
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 self-start sm:self-auto">
                Interactive Schedule
              </span>
            </div>
            <Plan />
          </div>
        ) : (
          <MyActivitySchedule />
        )}
      </div>
    </div>
  );
}
