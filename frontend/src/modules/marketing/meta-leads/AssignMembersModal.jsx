import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSearch, FiCheck, FiUsers, FiAlertTriangle, FiCheckCircle, FiLoader
} from 'react-icons/fi';

// Color Palette
const T = {
  white: '#ffffff',
  bg: '#f8fafc',
  border: '#e2e8f0',
  borderSoft: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#475569',
  muted: '#64748b',
  subtle: '#94a3b8',
  blue: '#2563eb',
  blueHover: '#1d4ed8',
  blueLight: '#eff6ff',
  blueBorder: '#bfdbfe',
  emerald: '#10b981',
  emeraldLight: '#ecfdf5',
  rose: '#f43f5e',
  roseLight: '#fff1f2',
};

// Avatar color palettes based on string hash
const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' }, // blue
  { bg: '#fef3c7', text: '#b45309' }, // amber
  { bg: '#dcfce7', text: '#15803d' }, // green
  { bg: '#f3e8ff', text: '#7e22ce' }, // purple
  { bg: '#ffe4e6', text: '#be123c' }, // rose
  { bg: '#e0e7ff', text: '#4338ca' }, // indigo
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'EM').toUpperCase();
}

export default function AssignMembersModal({
  isOpen,
  onClose,
  campaign,
  employees = [],
  currentAssignedUserIds = [],
  onConfirm
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(currentAssignedUserIds));
  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState('all'); // 'all' | 'telecaller' | 'marketing'
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Toggle selection for a user
  const toggleUser = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Filtered employees based on search & filter chip
  const filteredEmployees = useMemo(() => {
    const s = search.toLowerCase().trim();
    return employees.filter((emp) => {
      // 1. Filter Chip
      if (filterChip === 'telecaller') {
        const desig = (emp.designation || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const isTele = desig.includes('tele') || desig.includes('call') || desig.includes('sales') || dept.includes('sales');
        if (!isTele) return false;
      } else if (filterChip === 'marketing') {
        const desig = (emp.designation || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const isMkt = desig.includes('market') || dept.includes('market');
        if (!isMkt) return false;
      }

      // 2. Search query
      if (!s) return true;
      const name = (emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const desig = (emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      return name.includes(s) || email.includes(s) || desig.includes(s) || dept.includes(s);
    });
  }, [employees, search, filterChip]);

  // Handle Confirm Submission
  const handleConfirm = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await onConfirm(campaign, Array.from(selectedIds));
      setFeedback({ type: 'success', message: 'Members assigned successfully!' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to save assignment'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!saving ? onClose : undefined}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                <FiUsers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  Assign Campaign Access
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-normal">Campaign:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {campaign}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="px-6 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or designation..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterChip('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  filterChip === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterChip('telecaller')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  filterChip === 'telecaller'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tele-callers
              </button>
              <button
                type="button"
                onClick={() => setFilterChip('marketing')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  filterChip === 'marketing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Marketing
              </button>
            </div>
          </div>

          {/* Feedback Alert if any */}
          {feedback && (
            <div
              className={`px-6 py-2.5 flex items-center gap-2 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-b border-rose-100'
              }`}
            >
              {feedback.type === 'success' ? (
                <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Employee Profile Cards Grid */}
          <div className="p-6 overflow-y-auto max-h-[380px] bg-slate-50/30">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-10">
                <FiUsers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No employees found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.has(emp._id);
                  const avatarColor = getAvatarStyle(emp.name || emp.email || '');
                  const initials = getInitials(emp.name || emp.email || 'EM');
                  const designationText = emp.designation || 'Staff';
                  const departmentText = emp.department ? ` • ${emp.department}` : '';

                  return (
                    <div
                      key={emp._id}
                      onClick={() => toggleUser(emp._id)}
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-inner"
                          >
                            {initials}
                          </div>
                        )}
                        {/* Active Status Dot */}
                        <span
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                          title="Active"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {emp.name || 'Unknown'}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {designationText}{departmentText}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                          {emp.email}
                        </p>
                      </div>

                      {/* Custom Checkbox */}
                      <div className="absolute right-3 top-3.5">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 border border-blue-600 text-white'
                              : 'border border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <FiCheck className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{selectedIds.size}</span>{' '}
              {selectedIds.size === 1 ? 'member' : 'members'} selected
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    <span>Confirm Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
