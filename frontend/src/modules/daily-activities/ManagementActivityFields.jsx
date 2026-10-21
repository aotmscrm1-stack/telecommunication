import React from 'react';
import { Briefcase, Users, FileCheck, AlertCircle } from 'lucide-react';

export default function ManagementActivityFields({
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
        <Briefcase className="w-4 h-4 text-sky-600" />
        <span>Management Daily Log</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Team / Project */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Department / Team / Initiative
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.teamName || ''}
            onChange={(e) => handleChange('teamName', e.target.value)}
            placeholder="Team or department"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>

        {/* Targets & Progress */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Targets Achieved / Progress Metric
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.targetsProgress || ''}
            onChange={(e) => handleChange('targetsProgress', e.target.value)}
            placeholder="Progress metric"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>
      </div>

      {/* Key Activities & Meetings */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-sky-600" />
          <span>Key Activities Conducted & Meetings Held <span className="text-rose-500">*</span></span>
        </label>
        <textarea
          rows={3}
          disabled={disabled}
          value={departmentData.keyActivities || ''}
          onChange={(e) => handleChange('keyActivities', e.target.value)}
          placeholder="Meetings and team syncs conducted"
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white font-medium leading-relaxed"
        />
      </div>

      {/* Decisions Made */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strategic Decisions Made & Approvals Processed</span>
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          value={departmentData.decisionsMade || ''}
          onChange={(e) => handleChange('decisionsMade', e.target.value)}
          placeholder="Key decisions and approvals"
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white font-medium leading-relaxed"
        />
      </div>

      {/* Risks & Escalations */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Operational Risks, Bottlenecks & Escalations</span>
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          value={departmentData.risksEscalations || ''}
          onChange={(e) => handleChange('risksEscalations', e.target.value)}
          placeholder="Risks or bottlenecks (optional)"
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:bg-white font-medium leading-relaxed"
        />
      </div>
    </div>
  );
}
