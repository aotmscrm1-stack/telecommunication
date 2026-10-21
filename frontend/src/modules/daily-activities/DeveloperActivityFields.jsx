import React from 'react';
import { Code2, GitPullRequest, AlertTriangle, CheckCircle2 } from 'lucide-react';

const DEV_STATUS_OPTIONS = ['In Progress', 'Completed', 'Blocked', 'Code Review', 'Testing'];

export default function DeveloperActivityFields({
  departmentData = {},
  onChangeData,
  disabled = false,
}) {
  // Ensure departmentData.status is always initialized to 'In Progress' in the state
  React.useEffect(() => {
    if (!departmentData.status) {
      onChangeData({
        ...departmentData,
        status: 'In Progress',
      });
    }
  }, [departmentData.status]);

  const handleChange = (field, val) => {
    onChangeData({
      ...departmentData,
      [field]: val,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 tracking-wide mb-0.5">
        <Code2 className="w-4 h-4 text-sky-600" />
        <span>Developer Daily Report Details</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Project Name */}
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Project / Module Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.projectName || ''}
            onChange={(e) => handleChange('projectName', e.target.value)}
            placeholder="Project or module name"
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Task Status <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={disabled}
            value={departmentData.status || 'In Progress'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition cursor-pointer"
          >
            {DEV_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Task / Ticket ID */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Task / Ticket ID
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.ticketId || ''}
            onChange={(e) => handleChange('ticketId', e.target.value)}
            placeholder="Task or ticket ID"
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition"
          />
        </div>

        {/* Git Branch / PR Link */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1 flex items-center gap-1">
            <GitPullRequest className="w-3.5 h-3.5 text-slate-500" />
            <span>Git Branch / Pull Request Link</span>
          </label>
          <input
            type="url"
            disabled={disabled}
            value={departmentData.prLink || ''}
            onChange={(e) => handleChange('prLink', e.target.value)}
            placeholder="Branch or PR link"
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition"
          />
        </div>
      </div>

      {/* Work Completed */}
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Work Completed & Features Implemented <span className="text-rose-500">*</span></span>
        </label>
        <textarea
          rows={3}
          disabled={disabled}
          value={departmentData.workCompleted || ''}
          onChange={(e) => handleChange('workCompleted', e.target.value)}
          placeholder="Implemented features and progress"
          className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition leading-relaxed"
        />
      </div>

      {/* Blockers & Dependencies */}
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Blockers, API Dependencies & Challenges</span>
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          value={departmentData.blockers || ''}
          onChange={(e) => handleChange('blockers', e.target.value)}
          placeholder="Blockers or dependencies (optional)"
          className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition leading-relaxed"
        />
      </div>
    </div>
  );
}
