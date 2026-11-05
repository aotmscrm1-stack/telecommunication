import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  Save, 
  X, 
  ArrowRight,
  Loader2 
} from 'lucide-react';
import axios from 'axios';

export default function BeforeLogoutTaskModal({
  isOpen,
  onClose,
  unupdatedTasks = [],
  onTasksUpdated,
  onForceStop
}) {
  const [taskEdits, setTaskEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [forceLoading, setForceLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStatusChange = (taskId, status) => {
    setTaskEdits(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        status
      }
    }));
  };

  const handleReasonChange = (taskId, reason) => {
    setTaskEdits(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        reason
      }
    }));
  };

  const handleSaveTask = async (task) => {
    const edit = taskEdits[task.id] || {};
    const chosenStatus = edit.status || (task.status === 'upcoming' ? 'in_progress' : task.status);
    const reason = edit.reason || '';

    const isCompleted = chosenStatus === 'completed' || chosenStatus === 'done';
    if (!isCompleted && (!reason || !reason.trim())) {
      setErrorMsg(`Please enter a mandatory explanation reason for "${task.title}".`);
      return;
    }

    try {
      setSavingId(task.id);
      setErrorMsg('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.patch(`/api/todos/${task.id}/status`, {
        status: chosenStatus,
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSavedIds(prev => new Set([...prev, task.id]));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update task');
    } finally {
      setSavingId(null);
    }
  };

  const allUpdated = unupdatedTasks.length > 0 && unupdatedTasks.every(t => savedIds.has(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Checkpoint 2: Mandatory Task Status Update</h3>
              <p className="text-xs text-amber-100">Every daily task must be updated with current status and reasons before logout.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-xs text-slate-600 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900">Task update verification required:</span> The following {unupdatedTasks.length} task(s) do not have a confirmed status update for today. Select their current status and provide reasons for any ongoing, pending, or blocked work.
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {unupdatedTasks.map((task) => {
              const isSaved = savedIds.has(task.id);
              const edit = taskEdits[task.id] || {};
              const currentStatus = edit.status || (task.status === 'upcoming' ? 'in_progress' : task.status);

              return (
                <div 
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSaved 
                      ? 'bg-emerald-50/50 border-emerald-200' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800 line-clamp-1">{task.title}</span>
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Updated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3" /> Pending Update
                      </span>
                    )}
                  </div>

                  {!isSaved ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-4 gap-2">
                        {['completed', 'in_progress', 'pending', 'late'].map((st) => {
                          const labelMap = {
                            completed: 'Completed',
                            in_progress: 'In Progress',
                            pending: 'Pending',
                            late: 'Blocked'
                          };
                          const isSelected = currentStatus === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(task.id, st)}
                              className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                                isSelected
                                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {labelMap[st]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Reason Input */}
                      {currentStatus !== 'completed' && currentStatus !== 'done' && (
                        <div>
                          <input
                            type="text"
                            placeholder="Mandatory reason (e.g. Waiting for client confirmation)..."
                            value={edit.reason || ''}
                            onChange={(e) => handleReasonChange(task.id, e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                          />
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveTask(task)}
                          disabled={savingId === task.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                        >
                          {savingId === task.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-3 h-3" /> Confirm Status</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-700 mt-1">
                      Status saved as <span className="font-semibold uppercase">{currentStatus}</span>
                      {edit.reason ? `: "${edit.reason}"` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Warning: Ending attendance without updating tasks will trigger an official SHIFT_TASK_UPDATE_MISSING compliance ticket. Proceed anyway?')) {
                setForceLoading(true);
                await onForceStop();
                setForceLoading(false);
              }
            }}
            disabled={forceLoading}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline transition-colors"
          >
            {forceLoading ? 'Ending Attendance...' : 'Force End Attendance (Generate Ticket)'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onTasksUpdated}
              disabled={!allUpdated}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                allUpdated
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Complete & End Attendance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

