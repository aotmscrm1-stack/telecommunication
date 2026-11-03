import React, { useState, useEffect } from 'react';
import {
  FaCalendarCheck,
  FaUsers,
  FaUser,
  FaShieldHalved
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
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white flex items-center justify-center text-xl font-bold shadow-sm">
            <FaCalendarCheck />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Daily Activity Schedule
              </h1>
              {canViewAll && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  {canEdit ? 'Admin & Manager (Full Access)' : 'View Only'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Official regular responsibilities, working hours, and recurring schedule reference
            </p>
          </div>
        </div>

        {/* Tabs for HR / MD */}
        {canViewAll && (
          <div className="flex items-center p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FaUsers className="w-3.5 h-3.5" />
              <span>All Staff Schedules</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FaUser className="w-3 h-3" />
              <span>My Schedule</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab View */}
      {canViewAll && activeTab === 'all' ? (
        <AllEmployeeActivities
          currentUser={user}
          canEdit={canEdit}
          allEmployees={allEmployees}
        />
      ) : (
        <MyActivitySchedule />
      )}
    </div>
  );
}

