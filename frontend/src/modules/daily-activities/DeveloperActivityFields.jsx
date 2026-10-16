import React from 'react';
import { Code2, GitPullRequest, AlertTriangle, CheckCircle2 } from 'lucide-react';

const DEV_STATUS_OPTIONS = ['In Progress', 'Completed', 'Blocked', 'Code Review', 'Testing'];

export default function DeveloperActivityFields({
  departmentData = {},
  onChangeData,
  disabled = false,
}) {
  const handleChange = (field, val) => {
    onChangeData({
      ...departmentData,
      [field]: val,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
        <Code2 className="w-4 h-4 text-sky-600" />
        <span>Developer Daily Report Details</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Project Name */}
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Project / Module Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.projectName || ''}
            onChange={(e) => handleChange('projectName', e.target.value)}
            placeholder="e.g. AOTMS CRM / Telecaller Module"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Task Status <span className="text-rose-500">*</span>
          </label>
          <select
            disabled={disabled}
            value={departmentData.status || 'In Progress'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium cursor-pointer"
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
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Task / Ticket ID
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.ticketId || ''}
            onChange={(e) => handleChange('ticketId', e.target.value)}
            placeholder="e.g. JIRA-4021 or Issue #15"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>

        {/* Git Branch / PR Link */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
            <GitPullRequest className="w-3.5 h-3.5 text-slate-500" />
            <span>Git Branch / Pull Request Link</span>
          </label>
          <input
            type="url"
            disabled={disabled}
            value={departmentData.prLink || ''}
            onChange={(e) => handleChange('prLink', e.target.value)}
            placeholder="https://github.com/.../pull/..."
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>
      </div>

      {/* Work Completed */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Work Completed / Features Implemented <span className="text-rose-500">*</span></span>
        </label>
        <textarea
          rows={3}
          disabled={disabled}
          value={departmentData.workCompleted || ''}
          onChange={(e) => handleChange('workCompleted', e.target.value)}
          placeholder="Describe features implemented, bug fixes applied, and architectural changes..."
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
        />
      </div>

      {/* Blockers & Dependencies */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Blockers, API Dependencies & Technical Challenges</span>
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          value={departmentData.blockers || ''}
          onChange={(e) => handleChange('blockers', e.target.value)}
          placeholder="Note any pending backend endpoints, design specifications, or external service delays..."
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
        />
      </div>
    </div>
  );
}
