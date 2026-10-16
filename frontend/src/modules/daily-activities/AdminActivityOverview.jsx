import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { dailyActivityAPI } from '../../services/api';
import ActivityReportDrawer from './ActivityReportDrawer';

const DEPARTMENTS = ['All', 'Telecalling', 'Developer', 'Management', 'Trainer'];
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted (Pending Review)' },
  { value: 'reviewed', label: 'Reviewed & Approved' },
  { value: 'needs_correction', label: 'Needs Correction' },
  { value: 'draft', label: 'Draft Saved' },
];

export default function AdminActivityOverview() {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Inspection Drawer
  const [inspectReportId, setInspectReportId] = useState(null);

  useEffect(() => {
    loadOverview();
  }, [page, selectedDept, selectedStatus, fromDate, toDate]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page,
        limit: 15,
      };

      if (selectedDept !== 'All') params.department = selectedDept;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await dailyActivityAPI.getAdminOverview(params);
      if (res.data?.success) {
        setActivities(res.data.activities || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
        setSummary(res.data.summary || {});
      } else {
        setError(res.data?.message || 'Failed to fetch overview.');
      }
    } catch (err) {
      console.error('Admin overview error:', err);
      setError(err.response?.data?.message || 'Failed to fetch overview.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOverview();
  };

  const resetFilters = () => {
    setSelectedDept('All');
    setSelectedStatus('all');
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const getStatusBadge = (st) => {
    if (st === 'reviewed') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Reviewed</span>
        </span>
      );
    }
    if (st === 'submitted') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Submitted</span>
        </span>
      );
    }
    if (st === 'needs_correction') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-orange-600" />
          <span>Correction</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>Draft</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reports</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{total}</div>
        </div>
        <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Submitted</div>
          <div className="text-xl font-extrabold text-sky-900 mt-1">{summary.submitted || 0}</div>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Reviewed</div>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{summary.reviewed || 0}</div>
        </div>
        <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Needs Correction</div>
          <div className="text-xl font-extrabold text-orange-900 mt-1">{summary.needs_correction || 0}</div>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Drafts</div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">{summary.draft || 0}</div>
        </div>
      </div>

      {/* 2. Global Multi-Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-medium"
            />
          </form>

          {/* Reset button */}
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1.5 self-end md:self-auto cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Department filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium cursor-pointer"
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* 3. Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading organization reports...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-24 text-center text-slate-400 text-xs">
            No activity reports match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Summary Metrics</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((row) => {
                  const emp = row.employee || {};
                  const isTel = row.department?.toLowerCase().includes('telecall');

                  return (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs border border-sky-200">
                            {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name || 'Unknown'}</div>
                            <div className="text-[11px] text-slate-400">{emp.email || ''}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {row.department}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
                        {row.activityDate}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {isTel ? (
                          <span>
                            {row.metrics?.callsAttempted || 0} Calls ({row.metrics?.connectedCalls || 0} Conn,{' '}
                            {row.metrics?.interestedLeads || 0} Int)
                          </span>
                        ) : (
                          <span className="truncate max-w-[200px] block">
                            {row.remarks || row.departmentData?.projectName || 'Report logged'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">{getStatusBadge(row.status)}</td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setInspectReportId(row._id)}
                          className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Inspection & Review Drawer */}
      {inspectReportId && (
        <ActivityReportDrawer
          reportId={inspectReportId}
          onClose={() => setInspectReportId(null)}
          onReviewSuccess={loadOverview}
        />
      )}
    </div>
  );
}
