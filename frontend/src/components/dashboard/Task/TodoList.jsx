import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Flame, 
  Zap, 
  Leaf,
  Plus, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Check,
  ListTodo,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { isExecutive, isHR } from '../../../utils/permissions';
import { followupsAPI, todosAPI } from '../../../services/api';

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

// AutoScroll Name Component for Long Assignee & Assignor Names
function AutoScrollName({ prefix = '', name = '', className = '', style = {}, maxPx = 135 }) {
  const fullText = prefix ? `${prefix} ${name}` : name;
  const isLong = fullText.length > 15;

  return (
    <div 
      className={`relative overflow-hidden whitespace-nowrap ${className}`}
      style={{ maxWidth: maxPx, width: '100%', minWidth: 0, ...style }}
      title={fullText}
    >
      <style>{`
        @keyframes scroll-name-anim {
          0%, 20% { transform: translateX(0%); }
          80%, 100% { transform: translateX(min(0px, calc(-100% + ${maxPx}px))); }
        }
        .animate-autoscroll-name {
          display: inline-block;
          white-space: nowrap;
          animation: scroll-name-anim 6s ease-in-out infinite alternate;
        }
        .animate-autoscroll-name:hover {
          animation-play-state: paused;
        }
      `}</style>
      <span className={isLong ? "animate-autoscroll-name" : "truncate block"}>
        {prefix ? <span className="font-normal text-slate-400">{prefix} </span> : null}
        <span className="font-semibold text-slate-800">{name}</span>
      </span>
    </div>
  );
}

// Sub-item Checklist Component with instant MongoDB persistence & percentage calculation
function TodoChecklist({ text, task, onUpdated }) {
  const rawLines = text ? text.split('\n').map(l => l.trim()).filter(Boolean) : [];
  const hasDBChecklist = Array.isArray(task?.checklist) && task.checklist.length > 0;

  // Build items array combining DB checklist or multi-line text
  const items = hasDBChecklist
    ? task.checklist.map(c => ({
        title: (c.title || c.text || '').replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: !!c.completed,
        _id: c._id
      }))
    : rawLines.map((line) => ({
        title: line.replace(/^(\d+[\.\)]|[\-\*•])\s*/, ''),
        completed: false
      }));

  const [checkedMap, setCheckedMap] = useState(() => {
    const initial = {};
    items.forEach((item, idx) => {
      if (item.completed) initial[idx] = true;
    });
    return initial;
  });

  // Sync state if task prop updates
  useEffect(() => {
    const nextMap = {};
    items.forEach((item, idx) => {
      if (item.completed) nextMap[idx] = true;
    });
    setCheckedMap(nextMap);
  }, [task?.checklist, task?.updatedAt]);

  const handleToggle = async (idx, e) => {
    if (e) e.stopPropagation();
    const nextState = !checkedMap[idx];
    const newMap = { ...checkedMap, [idx]: nextState };
    setCheckedMap(newMap);

    if (task?._id) {
      try {
        const updatedChecklist = items.map((item, i) => {
          const isChecked = !!newMap[i];
          return {
            title: item.title,
            completed: isChecked,
            completedAt: isChecked ? new Date().toISOString() : null
          };
        });

        // Persist checkbox selection directly into MongoDB via API
        await Promise.all([
          todosAPI.update(task._id, { checklist: updatedChecklist }).catch(() => {}),
          followupsAPI.update(task._id, { checklist: updatedChecklist }).catch(() => {})
        ]);

        if (onUpdated) onUpdated();
      } catch (err) {
        console.error('Failed to update MongoDB checklist item:', err);
      }
    }
  };

  if (items.length === 0) {
    return <span className="text-slate-400 italic text-sm">No description provided</span>;
  }

  const total = items.length;
  const checkedCount = Object.keys(checkedMap).filter(k => checkedMap[k]).length;
  const percent = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const isMultiple = total > 1;
  const hasScroll = total > 3;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <style>{`
        .custom-hidden-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      {/* Sub-items Progress Bar & Percentage calculation */}
      {isMultiple && (
        <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-600 font-bold">
              <CheckSquare size={13} /> Sub-items Progress
            </span>
            <span className={`px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
              percent === 100 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-indigo-50 text-indigo-700'
            }`}>
              {checkedCount} / {total} ({percent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-400 rounded-full"
              style={{
                width: `${percent}%`,
                background: percent === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #4f46e5)'
              }}
            />
          </div>
        </div>
      )}

      {/* Scrollable Sub-items Container */}
      <div 
        className="custom-hidden-scroll flex flex-col gap-2"
        style={{
          maxHeight: hasScroll ? 120 : 'none',
          overflowY: hasScroll ? 'auto' : 'visible',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {items.map((item, idx) => {
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
                {item.title}
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

// Standalone TodoList Main Component
export default function TodoList({ 
  tasks = [], 
  fetchTasks, 
  onEditTask, 
  onCompleteTask, 
  onDeleteTask,
  historyMode = false,
  markingId = null,
  deletingId = null,
  priorityFilter: parentPriorityFilter,
  setPriorityFilter: parentSetPriorityFilter
}) {
  const { user: currentUser } = useAuth();
  
  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [internalPriorityFilter, setInternalPriorityFilter] = useState('all');

  const priorityFilter = (parentPriorityFilter !== undefined && parentPriorityFilter !== '') 
    ? parentPriorityFilter 
    : internalPriorityFilter;
  const setPriorityFilter = parentSetPriorityFilter || setInternalPriorityFilter;

  // Delete Permission Helper
  const checkCanDelete = (todo) => {
    if (!currentUser) return false;
    return true;
  };

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
      await todosAPI.create(payload);
      setQuickTitle('');
      if (fetchTasks) fetchTasks();
    } catch (err) {
      console.error('Quick Add Todo error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Filtered Todos with deduplication for recurring series
  const seenGroupIds = new Set();
  const seenRecurringKeys = new Set();
  const filteredTodos = tasks.filter(t => {
    if (priorityFilter !== 'all' && priorityFilter !== '' && t.priority !== priorityFilter) return false;
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

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* ── Quick Add Todo Bar ─────────────────────────────────────────────── */}
      {!historyMode && (
        <form onSubmit={handleQuickAdd} className="bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-3">
          <input
            type="text"
            placeholder="Add a new Todo item (e.g. 1. data analytics)..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
          
          <select
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 capitalize focus:outline-none focus:border-indigo-500"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>

          <button
            type="submit"
            disabled={isAdding || !quickTitle.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Plus size={15} />
            {isAdding ? 'Adding...' : 'Add Todo'}
          </button>
        </form>
      )}

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
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar user={assigneeObj} nameFallback={assigneeName} size={36} />
                    <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                      <AutoScrollName name={assigneeName} className="text-xs font-bold text-slate-900" maxPx={130} />
                      {assignedByName && (
                        <AutoScrollName prefix="Assigned by:" name={assignedByName} className="text-[11px] font-medium text-slate-500" maxPx={130} />
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1.5 capitalize ${
                    t.priority === 'high' 
                      ? 'bg-red-50 text-red-600 border-red-200' 
                      : t.priority === 'medium'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {t.priority === 'high' ? (
                      <><Flame size={12} className="text-red-500 flex-shrink-0" /> High</>
                    ) : t.priority === 'medium' ? (
                      <><Zap size={12} className="text-amber-500 flex-shrink-0" /> Medium</>
                    ) : (
                      <><Leaf size={12} className="text-emerald-500 flex-shrink-0" /> Low</>
                    )}
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

                {/* Completion Audit Log Badge for Completed History */}
                {(t.completedAt || t.status === 'done' || t.status === 'completed') && (
                  <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>Completed {t.completedAt ? formatIST(t.completedAt) : 'Recently'}</span>
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
                    {t.status !== 'done' && t.status !== 'completed' && (
                      <button
                        onClick={() => onCompleteTask && onCompleteTask(t._id)}
                        disabled={markingId === t._id}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs py-2 px-3 rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-sm shadow-orange-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        {markingId === t._id ? 'Saving...' : 'Mark Complete'}
                      </button>
                    )}

                    <button
                      onClick={() => onEditTask && onEditTask(t)}
                      className="bg-white border border-slate-200 text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                      title="Edit Todo"
                    >
                      <Edit3 size={14} />
                    </button>

                    {/* Delete Button */}
                    {checkCanDelete(t) && (
                      <button
                        onClick={() => onDeleteTask && onDeleteTask(t._id)}
                        disabled={deletingId === t._id}
                        className="bg-red-50 border border-red-200 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                        title="Delete Todo"
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
