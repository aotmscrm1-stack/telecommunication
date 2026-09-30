import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Flame, 
  Zap, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  TrendingUp, 
  UserCheck, 
  FileSpreadsheet,
  Filter,
  Check,
  ChevronDown,
  RotateCcw,
  ListTodo
} from 'lucide-react';
import { followupsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// Helper for IST DateTime formatting
function formatIST(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
}

// User Avatar helper
function Avatar({ user, nameFallback = 'User', size = 32 }) {
  const avatarUrl = user?.avatar || user?.profileImage || user?.photo;
  const name = user?.name || user?.displayName || nameFallback;
  const initials = (name || 'U').slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      color: '#3730a3',
      fontSize: size * 0.38,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1.5px solid #c7d2fe',
      flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

// Sub-item Checklist Component with instant MongoDB persistence
function TodoChecklist({ text, task, onUpdated }) {
  if (!text || !text.trim()) return <span className="text-slate-400 italic text-sm">No description provided</span>;

  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const isNumbered = rawLines.length > 0 && rawLines.some(l => /^\d+[\.\)]\s*/.test(l));

  const [checkedMap, setCheckedMap] = useState(() => {
    const initial = {};
    if (task?.checklist && Array.isArray(task.checklist) && task.checklist.length > 0) {
      task.checklist.forEach((item, idx) => {
        if (item.completed) initial[idx] = true;
      });
    }
    return initial;
  });

  const handleToggle = async (idx, e) => {
    e.stopPropagation();
    const nextState = !checkedMap[idx];
    const newMap = { ...checkedMap, [idx]: nextState };
    setCheckedMap(newMap);

    if (task?._id) {
      try {
        const updatedChecklist = rawLines.map((line, i) => {
          const cleanText = line.replace(/^\d+[\.\)]\s*/, '');
          const isChecked = !!newMap[i];
          return {
            title: cleanText || line,
            completed: isChecked,
            completedAt: isChecked ? new Date().toISOString() : null
          };
        });
        await followupsAPI.update(task._id, { checklist: updatedChecklist });
        if (onUpdated) onUpdated();
      } catch (err) {
        console.error('Failed to update DB checklist item:', err);
      }
    }
  };

  if (isNumbered) {
    const total = rawLines.length;
    const checkedCount = Object.values(checkedMap).filter(Boolean).length;
    const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    const hasScroll = total > 2;

    return (
      <div className="flex flex-col gap-2.5 w-full">
        <style>{`
          .custom-hidden-scroll::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `}</style>

        {/* Sub-items Progress Bar (Sticky Header) */}
        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <CheckSquare size={13} /> Sub-items Progress
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-extrabold text-[11px]">
              {checkedCount} / {total} ({percent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-400 rounded-full"
              style={{
                width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #4f46e5)'
              }}
            />
          </div>
        </div>

        {/* Scrollable Sub-items Container (Exactly 2 items visible, scroll for rest) */}
        <div 
          className="custom-hidden-scroll flex flex-col gap-2"
          style={{
            maxHeight: hasScroll ? 80 : 'none',
            overflowY: hasScroll ? 'auto' : 'visible',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {rawLines.map((line, idx) => {
            const cleanText = line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, '');
            const isChecked = !!checkedMap[idx];
            return (
              <div
                key={idx}
                onClick={(e) => handleToggle(idx, e)}
                className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all duration-150 border ${
                  isChecked 
                    ? 'bg-emerald-50/60 border-emerald-200/60 text-slate-500' 
                    : 'bg-white border-slate-200/70 hover:border-indigo-300 hover:translate-x-0.5 text-slate-800 shadow-xs'
                }`}
              >
                <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                  isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-2 border-slate-300 bg-white'
                }`}>
                  {isChecked && <Check size={11} strokeWidth={3.5} />}
                </div>
                <span className={`text-xs font-medium leading-relaxed ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                  {cleanText || line}
                </span>
              </div>
            );
          })}
        </div>

        {hasScroll && (
          <div className="text-[10px] font-medium text-slate-400 text-center flex items-center justify-center gap-1">
            <span>Scroll for more sub-items</span> ↓
          </div>
        )}
      </div>
    );
  }

  const isLongText = text.length > 250;
  return (
    <div 
      className="custom-hidden-scroll text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal"
      style={{
        maxHeight: isLongText ? 150 : 'none',
        overflowY: isLongText ? 'auto' : 'visible',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      <style>{`
        .custom-hidden-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      {text}
    </div>
  );
}

// ── Standalone TodoList Main Component ───────────────────────────────────────
export default function TodoList({ 
  tasks = [], 
  fetchTasks, 
  onEditTask, 
  onCompleteTask, 
  onDeleteTask,
  historyMode = false,
  markingId = null,
  deletingId = null
}) {
  const { user: currentUser } = useAuth();
  
  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Strict Admin Only Delete Permission
  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // 1-Click Quick Add Handler
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setIsAdding(true);
    try {
      const payload = {
        type: 'todo',
        title: quickTitle.trim(),
        note: quickTitle.trim(),
        description: quickTitle.trim(),
        scheduledAt: new Date().toISOString(),
        priority: quickPriority,
        assignedTo: currentUser?._id,
        assignedBy: currentUser?._id,
      };
      await followupsAPI.create(payload);
      setQuickTitle('');
      if (fetchTasks) fetchTasks();
    } catch (err) {
      console.error('Quick Add Todo error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Filtered Todos with single card deduplication for recurring series
  const seenGroupIds = new Set();
  const seenRecurringKeys = new Set();
  const filteredTodos = tasks.filter(t => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const noteStr = (t.title || t.note || t.description || '').toLowerCase();
      const assigneeStr = (t.assignedTo?.name || '').toLowerCase();
      if (!noteStr.includes(q) && !assigneeStr.includes(q)) return false;
    }

    const isRec = !!(t.recurrence?.frequency || t.recurrenceFrequency || (t.recurrence && t.recurrence.frequency !== 'none'));
    if (isRec) {
      if (t.recurringGroupId) {
        const gId = String(t.recurringGroupId);
        if (seenGroupIds.has(gId)) return false;
        seenGroupIds.add(gId);
      } else {
        const assigneeId = t.assignedTo?._id || t.assignedTo || '';
        const taskTitle = (t.title || t.note || t.description || '').trim();
        const freq = t.recurrence?.frequency || t.recurrenceFrequency || '';
        const recKey = `${taskTitle}_${assigneeId}_${freq}`;
        if (seenRecurringKeys.has(recKey)) return false;
        seenRecurringKeys.add(recKey);
      }
    }
    return true;
  });

  // KPI Statistics
  const totalCount = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'upcoming' || t.status === 'pending').length;
  const overdueCount = tasks.filter(t => t.status === 'upcoming' && new Date(t.scheduledAt) < new Date()).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* ── KPI Statistics Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Todos */}
        <div className="bg-gradient-to-br from-white to-indigo-50/30 border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Todos</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
              <ListTodo size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-3">{totalCount}</div>
          <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" /> Active workspace items
          </div>
        </div>

        {/* Completed */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-200/70 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 mt-3">{completedCount}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp size={13} /> {completionRate}% rate finished
          </div>
        </div>

        {/* Pending */}
        <div className="bg-gradient-to-br from-white to-amber-50/40 border border-amber-200/70 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Upcoming / Pending</span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-900 mt-3">{pendingCount}</div>
          <div className="text-xs font-medium text-amber-600 mt-1">Pending action checklists</div>
        </div>

        {/* Overdue Alert */}
        <div className={`border rounded-2xl p-5 shadow-sm transition-all ${
          overdueCount > 0 
            ? 'bg-gradient-to-br from-red-50 to-rose-100/50 border-red-200/90 shadow-red-100/50 animate-pulse' 
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${overdueCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>
              Overdue Alert
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              overdueCount > 0 ? 'bg-red-200/80 text-red-600' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className={`text-3xl font-extrabold mt-3 ${overdueCount > 0 ? 'text-red-900' : 'text-slate-900'}`}>
            {overdueCount}
          </div>
          <div className={`text-xs font-semibold mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {overdueCount > 0 ? '⚠️ Immediate action needed' : 'All items on schedule'}
          </div>
        </div>
      </div>

      {/* ── 1-Click Quick Add Input Bar ─────────────────────────────────────── */}
      {!historyMode && (
        <form
          onSubmit={handleQuickAdd}
          className="bg-white border-2 border-indigo-500/20 focus-within:border-indigo-500 rounded-2xl p-3.5 shadow-md shadow-indigo-100/50 flex flex-wrap items-center gap-3 transition-all duration-200"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder="Quick add a new Todo item... (e.g. 1. Submit report, 2. Followup call)"
              className="w-full text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={quickPriority}
              onChange={e => setQuickPriority(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer hover:bg-slate-200/70 transition-colors"
            >
              <option value="high">🔥 High Priority</option>
              <option value="medium">⚡ Medium Priority</option>
              <option value="low">🌱 Low Priority</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !quickTitle.trim()}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              {isAdding ? 'Adding...' : '+ Add Todo'}
            </button>
          </div>
        </form>
      )}

      {/* ── Filter & Search Toolbar ───────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search todo items..."
            className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter size={13} /> Priority:
          </span>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>
        </div>
      </div>

      {/* ── Todo Items Cards Grid ───────────────────────────────────────────── */}
      {filteredTodos.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <ListTodo size={40} className="mx-auto text-slate-300 mb-3" />
          <h4 className="text-base font-semibold text-slate-700">No Todo Items Found</h4>
          <p className="text-xs text-slate-400 mt-1">There are no active todos matching your current criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTodos.map(t => {
            const isLate = t.status === 'upcoming' && new Date(t.scheduledAt) < new Date();
            const assigneeObj = t.assignedTo || t.assignee;
            const assigneeName = assigneeObj?.name || 'Me';
            const assignedByObj = t.assignedBy;
            const assignedByName = (assignedByObj?.name || assignedByObj) === 'all' ? 'All' : (assignedByObj?.name || '');

            return (
              <div
                key={t._id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-lg transition-all duration-200 relative ${
                  isLate ? 'border-red-200/90 shadow-red-50' : 'border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                {/* Card Top: Assignee & Priority */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar user={assigneeObj} nameFallback={assigneeName} size={36} />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{assigneeName}</div>
                      {assignedByName && (
                        <div className="text-[11px] font-medium text-slate-400">
                          Assigned by: <span className="text-slate-700 font-semibold">{assignedByName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 capitalize ${
                    t.priority === 'high' 
                      ? 'bg-red-50 text-red-600 border-red-200' 
                      : t.priority === 'medium'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {t.priority === 'high' ? '🔥 High' : t.priority === 'medium' ? '⚡ Medium' : '🌱 Low'}
                  </span>
                </div>

                {/* Center Description / Checklist */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 min-h-[70px]">
                  <TodoChecklist 
                    text={t.title || t.note || t.description || ''} 
                    task={t} 
                    onUpdated={fetchTasks}
                  />
                </div>

                {/* Completion Audit Log */}
                {t.completedAt && (
                  <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Completed {formatIST(t.completedAt)}</span>
                    {t.completedBy && (
                      <span className="font-bold ml-auto text-emerald-900">by {t.completedBy.name || 'User'}</span>
                    )}
                  </div>
                )}

                {/* Card Footer: Due Date & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-indigo-500" />
                      {t.scheduledAt ? formatIST(t.scheduledAt) : 'No due date'}
                    </span>

                    {isLate && (
                      <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle size={11} /> Overdue
                      </span>
                    )}
                  </div>

                  {/* Actions Buttons Toolbar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCompleteTask && onCompleteTask(t._id)}
                      disabled={markingId === t._id}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs py-2 px-3 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {markingId === t._id ? 'Saving...' : 'Mark Complete'}
                    </button>

                    <button
                      onClick={() => onEditTask && onEditTask(t)}
                      className="bg-white border border-slate-200 text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                      title="Edit Todo"
                    >
                      <Edit3 size={14} />
                    </button>

                    {/* Strict Admin Only Delete Button */}
                    {canDelete && (
                      <button
                        onClick={() => onDeleteTask && onDeleteTask(t._id)}
                        disabled={deletingId === t._id}
                        className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                        title="Delete Todo (Admin Only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
