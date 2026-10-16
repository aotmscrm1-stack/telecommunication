import React from 'react';
import { GraduationCap, BookOpen, Users, FileQuestion } from 'lucide-react';

export default function TrainerActivityFields({
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
        <GraduationCap className="w-4 h-4 text-sky-600" />
        <span>Trainer & Academy Daily Log</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Course / Batch */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Course / Batch Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.courseBatch || ''}
            onChange={(e) => handleChange('courseBatch', e.target.value)}
            placeholder="e.g. Full Stack Python - Batch #14"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>

        {/* Session Topic */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Session Topic <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            disabled={disabled}
            value={departmentData.sessionTopic || ''}
            onChange={(e) => handleChange('sessionTopic', e.target.value)}
            placeholder="e.g. Asynchronous JavaScript & REST APIs"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Classes Conducted */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            Classes / Sessions Conducted
          </label>
          <input
            type="number"
            min="0"
            disabled={disabled}
            value={departmentData.classesConducted ?? ''}
            onChange={(e) => handleChange('classesConducted', Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="e.g. 2"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>

        {/* Student Attendance Count */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Student Attendance Count</span>
          </label>
          <input
            type="number"
            min="0"
            disabled={disabled}
            value={departmentData.attendanceCount ?? ''}
            onChange={(e) => handleChange('attendanceCount', Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="e.g. 28"
            className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
          />
        </div>
      </div>

      {/* Topics Covered */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          <span>Detailed Topics Covered & Practical Labs <span className="text-rose-500">*</span></span>
        </label>
        <textarea
          rows={3}
          disabled={disabled}
          value={departmentData.topicsCovered || ''}
          onChange={(e) => handleChange('topicsCovered', e.target.value)}
          placeholder="List theoretical concepts taught, hands-on coding exercises, and student Q&A discussions..."
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
        />
      </div>

      {/* Assignments & Assessments */}
      <div>
        <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
          <FileQuestion className="w-3.5 h-3.5 text-amber-500" />
          <span>Assignments Given & Student Progress Feedback</span>
        </label>
        <textarea
          rows={2}
          disabled={disabled}
          value={departmentData.assignmentsFeedback || ''}
          onChange={(e) => handleChange('assignmentsFeedback', e.target.value)}
          placeholder="Mention homework assignments given, upcoming tests, or students requiring additional mentoring..."
          className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
        />
      </div>
    </div>
  );
}
