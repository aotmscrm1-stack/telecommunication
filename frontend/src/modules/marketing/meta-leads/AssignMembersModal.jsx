import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSearch, FiCheck, FiUsers, FiAlertTriangle, FiCheckCircle, FiLoader
} from 'react-icons/fi';

// "Create Todo Item" Palette
const TODO_DEEP_BLUE = '#023047';
const TODO_BLUE_GREEN = '#219ebc';
const TODO_SKY_SURFACE = '#e8f4fa';
const TODO_BORDER = '#bbdff0';
const TODO_INPUT_BORDER = '#d8e2eb';
const TODO_ORANGE = '#fb8500';
const TODO_MUTED = '#5b7082';

const AVATAR_COLORS = [
  { bg: '#e8f4fa', text: '#023047' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#ffe4e6', text: '#be123c' },
  { bg: '#e0e7ff', text: '#4338ca' },
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
  const [selectedIds, setSelectedIds] = useState(() => new Set((currentAssignedUserIds || []).map(String)));
  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState('all'); // 'all' | 'assigned' | 'telecaller' | 'marketing'
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set((currentAssignedUserIds || []).map(id => String(id?._id || id))));
      setSearch('');
      setFilterChip('all');
      setFeedback(null);
    }
  }, [isOpen, campaign, currentAssignedUserIds]);

  const toggleUser = (userId) => {
    const idStr = String(userId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  const removeMember = (userId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const idStr = String(userId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(idStr);
      return next;
    });
  };

  const clearAllSelected = () => {
    setSelectedIds(new Set());
  };

  const filteredEmployees = useMemo(() => {
    const s = search.toLowerCase().trim();
    return employees.filter((emp) => {
      const empIdStr = String(emp._id || emp.id);

      if (filterChip === 'assigned') {
        if (!selectedIds.has(empIdStr)) return false;
      } else if (filterChip === 'telecaller') {
        const desig = (emp.designation || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const isTele = desig.includes('tele') || desig.includes('call') || desig.includes('sales') || dept.includes('sales') || desig.includes('counsellor');
        if (!isTele) return false;
      } else if (filterChip === 'marketing') {
        const desig = (emp.designation || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const isMkt = desig.includes('market') || dept.includes('market');
        if (!isMkt) return false;
      }

      if (!s) return true;
      const name = (emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const desig = (emp.designation || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      return name.includes(s) || email.includes(s) || desig.includes(s) || dept.includes(s);
    });
  }, [employees, search, filterChip, selectedIds]);

  const selectedEmployeeObjects = useMemo(() => {
    return employees.filter(emp => selectedIds.has(String(emp._id || emp.id)));
  }, [employees, selectedIds]);

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
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 48, 71, 0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}
        onClick={!saving ? onClose : undefined}
      >
        {/* Modal Window — "Create Todo Item" Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 520,
            padding: 24,
            boxShadow: '0 12px 36px rgba(2, 48, 71, 0.16)',
            border: `1px solid ${TODO_BORDER}`,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 500, color: TODO_DEEP_BLUE, margin: 0 }}>
              Assign Campaign Access
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 22,
                color: TODO_MUTED,
                lineHeight: 1,
                padding: 0
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
            {/* Campaign Info Box */}
            <div
              style={{
                background: TODO_SKY_SURFACE,
                border: `1px solid ${TODO_BORDER}`,
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: TODO_BLUE_GREEN, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Target Meta Campaign
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TODO_DEEP_BLUE, marginTop: 2 }}>
                  {campaign}
                </div>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: `1px solid ${TODO_BORDER}`,
                  background: '#fff',
                  color: TODO_BLUE_GREEN
                }}
              >
                {selectedIds.size} Selected
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: TODO_MUTED, width: 15, height: 15 }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search team members by name, email, or role..."
                  style={{
                    width: '100%',
                    padding: '9px 32px 9px 34px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: `1px solid ${TODO_INPUT_BORDER}`,
                    background: '#f8fbfd',
                    color: TODO_DEEP_BLUE,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: TODO_MUTED, cursor: 'pointer' }}
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'all', label: `All (${employees.length})` },
                    { key: 'assigned', label: `Assigned (${selectedIds.size})` },
                    { key: 'telecaller', label: 'Tele-callers' },
                    { key: 'marketing', label: 'Marketing' },
                  ].map(chip => {
                    const active = filterChip === chip.key;
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => setFilterChip(chip.key)}
                        style={{
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 500,
                          borderRadius: 6,
                          border: `1px solid ${active ? TODO_BLUE_GREEN : TODO_INPUT_BORDER}`,
                          background: active ? TODO_SKY_SURFACE : '#fff',
                          color: active ? TODO_DEEP_BLUE : TODO_MUTED,
                          cursor: 'pointer'
                        }}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSelected}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline px-1 py-0.5"
                  >
                    Deselect All ({selectedIds.size})
                  </button>
                )}
              </div>

              {selectedEmployeeObjects.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-t border-slate-100 pt-2">
                  <span style={{ fontSize: 11, fontWeight: 600, color: TODO_MUTED }} className="uppercase tracking-wide shrink-0">
                    Assigned:
                  </span>
                  {selectedEmployeeObjects.map((emp) => (
                    <span
                      key={emp._id || emp.id}
                      style={{
                        background: TODO_SKY_SURFACE,
                        color: TODO_DEEP_BLUE,
                        border: `1px solid ${TODO_BORDER}`
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0"
                    >
                      <span>{emp.name || emp.email}</span>
                      <button
                        type="button"
                        onClick={(e) => removeMember(emp._id || emp.id, e)}
                        title="Remove / Deselect"
                        className="w-3.5 h-3.5 rounded-full bg-sky-200 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors text-sky-900"
                      >
                        <FiX className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {feedback && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  color: feedback.type === 'success' ? '#065f46' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {feedback.type === 'success' ? <FiCheckCircle size={14} /> : <FiAlertTriangle size={14} />}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Employee List */}
            <div style={{ overflowY: 'auto', maxHeight: 280, border: `1px solid ${TODO_INPUT_BORDER}`, borderRadius: 8, background: '#f8fbfd', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <FiUsers className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p style={{ fontSize: 13, fontWeight: 500, color: TODO_DEEP_BLUE }}>No employees found</p>
                  <p style={{ fontSize: 11.5, color: TODO_MUTED }}>Try adjusting your search or filter</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const empIdStr = String(emp._id || emp.id);
                  const isSelected = selectedIds.has(empIdStr);
                  const avatarColor = getAvatarStyle(emp.name || emp.email || '');
                  const initials = getInitials(emp.name || emp.email || 'EM');
                  const designationText = emp.designation || 'Staff';
                  const departmentText = emp.department ? ` • ${emp.department}` : '';

                  return (
                    <div
                      key={empIdStr}
                      onClick={() => toggleUser(empIdStr)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? TODO_BLUE_GREEN : TODO_INPUT_BORDER}`,
                        background: isSelected ? TODO_SKY_SURFACE : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={emp.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                          >
                            {initials}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: TODO_DEEP_BLUE }} className="truncate">
                            {emp.name || 'Unknown'}
                          </div>
                          <div style={{ fontSize: 11.5, color: TODO_MUTED }} className="truncate">
                            {designationText}{departmentText}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: isSelected ? '#ffe4e6' : TODO_SKY_SURFACE,
                            color: isSelected ? '#be123c' : TODO_BLUE_GREEN
                          }}
                        >
                          {isSelected ? 'Remove' : '+ Add'}
                        </span>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isSelected ? TODO_BLUE_GREEN : '#fff',
                            border: `1px solid ${isSelected ? TODO_BLUE_GREEN : TODO_INPUT_BORDER}`,
                            color: '#fff'
                          }}
                        >
                          {isSelected && <FiCheck size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer — Identical to "Create Todo Item" */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
            <div style={{ fontSize: 12.5, color: TODO_MUTED }}>
              <strong style={{ color: TODO_DEEP_BLUE }}>{selectedIds.size}</strong> {selectedIds.size === 1 ? 'member' : 'members'} selected
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '9px 18px',
                  fontSize: 13.5,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: `1px solid ${TODO_INPUT_BORDER}`,
                  background: '#fff',
                  color: TODO_MUTED,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  padding: '9px 20px',
                  fontSize: 13.5,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: 'none',
                  background: saving ? '#f8c284' : TODO_ORANGE,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {saving ? (
                  <>
                    <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm Assignment</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
