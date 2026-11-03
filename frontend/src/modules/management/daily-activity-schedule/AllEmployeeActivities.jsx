import React, { useState, useEffect } from 'react';
import {
  FaMagnifyingGlass,
  FaFilter,
  FaPlus,
  FaEye,
  FaPen,
  FaClock,
  FaBriefcase,
  FaIdBadge,
  FaBuilding,
  FaTriangleExclamation,
  FaTableList,
  FaBorderAll,
  FaBoxArchive,
  FaRotate,
  FaCheck,
  FaUserCheck
} from 'react-icons/fa6';
import { dailyActivityScheduleAPI } from '../../../services/api';
import ActivityScheduleDetailModal from './ActivityScheduleDetailModal';
import ActivityScheduleFormModal from './ActivityScheduleFormModal';
import StagingReviewModal from './StagingReviewModal';

export default function AllEmployeeActivities({
  currentUser,
  canEdit = false,
  allEmployees = []
}) {
  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [stagingItems, setStagingItems] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [formInitialData, setFormInitialData] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const [selectedStaging, setSelectedStaging] = useState(null);
  const [showStagingModal, setShowStagingModal] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Fetch Directory and Staging
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [dirRes, stagingRes] = await Promise.all([
        dailyActivityScheduleAPI.getAll(params),
        dailyActivityScheduleAPI.getStaging().catch(() => ({ data: { staging: [] } }))
      ]);

      if (dirRes.data) {
        setDirectory(dirRes.data.directory || []);
      }
      if (stagingRes.data) {
        setStagingItems(stagingRes.data.staging || []);
      }
    } catch (err) {
      console.error('Failed to load activity schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [departmentFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Archive / Restore
  const handleArchiveToggle = async (schedule) => {
    if (!schedule?._id) return;
    try {
      if (schedule.publishStatus === 'archived') {
        await dailyActivityScheduleAPI.restore(schedule._id);
        setFeedbackMsg(`Schedule for ${schedule.employee?.name} restored.`);
      } else {
        await dailyActivityScheduleAPI.archive(schedule._id);
        setFeedbackMsg(`Schedule for ${schedule.employee?.name} archived.`);
      }
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed');
    }
  };

  // Departments list for filter
  const departments = Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean)));

  // KPI Calculations
  const totalEmployees = directory.length;
  const configuredCount = directory.filter(d => d.isConfigured).length;
  const unconfiguredCount = totalEmployees - configuredCount;
  const pendingStagingCount = stagingItems.filter(s => !s.isCreatedInDb).length;

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg('')} className="text-sky-500 hover:text-sky-800 font-bold">✕</button>
        </div>
      )}

      {/* Pending Staging Alert Banner for HR / Admin */}
      {pendingStagingCount > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-amber-200/90 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
              <FaTriangleExclamation />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {pendingStagingCount} Employee Profile{pendingStagingCount > 1 ? 's' : ''} Awaiting HR Review
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Schedules for employees with source discrepancies remain unpublished until confirmed by HR.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {stagingItems.filter(s => !s.isCreatedInDb).map(st => (
              <button
                key={st.key}
                type="button"
                onClick={() => {
                  setSelectedStaging(st);
                  setShowStagingModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Verify {st.sourceName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Staff</span>
          <span className="text-2xl font-bold text-slate-900">{totalEmployees}</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Configured</span>
          <span className="text-2xl font-bold text-emerald-700">{configuredCount}</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Unconfigured</span>
          <span className="text-2xl font-bold text-slate-700">{unconfiguredCount}</span>
        </div>
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Pending Review</span>
          <span className="text-2xl font-bold text-amber-700">{pendingStagingCount}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <FaMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="configured">Configured Only</option>
            <option value="unconfigured">Unconfigured Only</option>
            <option value="published">Published</option>
            <option value="draft">Draft / In Review</option>
            <option value="archived">Archived</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <FaBorderAll className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <FaTableList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Schedule Button */}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setFormInitialData(null);
                setShowFormModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <FaPlus className="w-3 h-3" />
              <span>Configure Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid or Table */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-slate-200/70 rounded-3xl" />
          ))}
        </div>
      ) : directory.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
          <FaFilter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold text-slate-600">No matching employee records found.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your search query or department filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directory.map(({ user, schedule, isConfigured }) => {
            const workingHours = schedule?.workingHours || {};
            const responsibilities = schedule?.keyResponsibilities || [];
            const isArchived = schedule?.publishStatus === 'archived';

            return (
              <div
                key={user._id}
                className={`p-5 rounded-3xl border transition shadow-2xs flex flex-col justify-between gap-4 ${
                  isArchived
                    ? 'bg-slate-50/80 border-slate-200 opacity-75'
                    : isConfigured
                    ? 'bg-white border-slate-200/90 hover:border-sky-300 hover:shadow-md'
                    : 'bg-slate-50/50 border-dashed border-slate-300'
                }`}
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {(user.name?.charAt(0) || 'E').toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{user.name}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span className="font-semibold text-slate-700">{user.employeeId || 'ID N/A'}</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{user.department || 'General'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isConfigured ? (
                        schedule.publishStatus === 'published' ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Published
                          </span>
                        ) : schedule.publishStatus === 'draft' ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Draft
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Archived
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                          Unconfigured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 inline-block">
                    {user.designation || 'Staff'}
                  </div>

                  {/* Working Hours */}
                  {isConfigured && (workingHours.loginTime || workingHours.logoutTime) ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                      <FaClock className="text-sky-500 text-[11px]" />
                      <span>{workingHours.loginTime || '—'} – {workingHours.logoutTime || '—'}</span>
                    </div>
                  ) : null}

                  {/* Responsibilities Snippet */}
                  {isConfigured && responsibilities.length > 0 ? (
                    <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {responsibilities.join(' • ')}
                    </div>
                  ) : !isConfigured ? (
                    <p className="text-[11px] text-slate-400 italic">No schedule configured yet.</p>
                  ) : null}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isConfigured ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setShowDetailModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaEye className="w-3 h-3 text-slate-500" />
                        <span>View Details</span>
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormInitialData(schedule);
                            setShowFormModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <FaPen className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </>
                  ) : (
                    canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormInitialData({ employee: user });
                          setShowFormModal(true);
                        }}
                        className="w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FaPlus className="w-3 h-3" />
                        <span>Configure Schedule</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-3">ID</th>
                  <th className="py-3.5 px-3">Department</th>
                  <th className="py-3.5 px-3">Designation</th>
                  <th className="py-3.5 px-3">Working Hours</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {directory.map(({ user, schedule, isConfigured }) => {
                  const workingHours = schedule?.workingHours || {};
                  return (
                    <tr key={user._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {user.name}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {user.employeeId || '—'}
                      </td>
                      <td className="py-3 px-3">{user.department || '—'}</td>
                      <td className="py-3 px-3">{user.designation || '—'}</td>
                      <td className="py-3 px-3">
                        {isConfigured && (workingHours.loginTime || workingHours.logoutTime) ? (
                          <span className="font-semibold text-slate-800">
                            {workingHours.loginTime || '—'} – {workingHours.logoutTime || '—'}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isConfigured ? (
                          schedule.publishStatus === 'published' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Draft
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-400">
                            Unconfigured
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isConfigured ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setShowDetailModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer"
                            >
                              View
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormInitialData(schedule);
                                  setShowFormModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormInitialData({ employee: user });
                                setShowFormModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Configure
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ActivityScheduleDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        schedule={selectedSchedule}
        canEdit={canEdit}
        onEdit={(sch) => {
          setFormInitialData(sch);
          setShowFormModal(true);
        }}
        onArchiveToggle={handleArchiveToggle}
      />

      {/* Form Modal */}
      <ActivityScheduleFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        initialData={formInitialData}
        allEmployees={allEmployees}
        onSaved={() => {
          fetchData();
          setFeedbackMsg('Schedule saved successfully.');
        }}
      />

      {/* Staging Review Modal */}
      <StagingReviewModal
        isOpen={showStagingModal}
        onClose={() => setShowStagingModal(false)}
        stagingItem={selectedStaging}
        allEmployees={allEmployees}
        onConfirmed={() => {
          fetchData();
          setFeedbackMsg('Profile verified and schedule created.');
        }}
      />
    </div>
  );
}

