import React from 'react';
import {
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Building2,
  ExternalLink,
  MessageSquare,
  ArrowRightCircle,
} from 'lucide-react';
import TelecallingActivityFields from './TelecallingActivityFields';
import DeveloperActivityFields from './DeveloperActivityFields';
import ManagementActivityFields from './ManagementActivityFields';
import TrainerActivityFields from './TrainerActivityFields';

export default function DepartmentActivityForm({
  selectedDate,
  activity,
  user,
  loading = false,
  saving = false,
  submitting = false,
  formData,
  setFormData,
  onSaveDraft,
  onSubmitReport,
}) {
  const department = user?.department || 'Telecalling';
  const deptNormalized = department.toLowerCase();

  const isTelecalling = deptNormalized.includes('telecall') || deptNormalized.includes('caller');
  const isDeveloper = deptNormalized.includes('dev');
  const isManagement = deptNormalized.includes('manage') || user?.role === 'manager';
  const isTrainer = deptNormalized.includes('train');
  const isDigitalMarketing = deptNormalized.includes('market') || deptNormalized.includes('digital');

  const status = activity?.status || 'draft';
  const isSubmitted = status === 'submitted';
  const isReviewed = status === 'reviewed';
  const isNeedsCorrection = status === 'needs_correction';
  const isReadOnly = isSubmitted || isReviewed;

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStatusBadge = () => {
    if (isReviewed) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Reviewed & Approved</span>
        </span>
      );
    }
    if (isSubmitted) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Submitted (Pending Review)</span>
        </span>
      );
    }
    if (isNeedsCorrection) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1 shadow-2xs animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <span>Needs Correction</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Draft</span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-6">
      {/* 1. Header Information */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Activity Date:</span>
            <span className="font-bold text-slate-800">{formattedDate}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{user?.name || 'Employee'}</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                {department}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {getStatusBadge()}
        </div>
      </div>

      {/* 2. Status Banners */}
      {isNeedsCorrection && (
        <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 text-orange-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-extrabold text-orange-800 uppercase tracking-wide">
              Management Correction Requested
            </div>
            <div className="mt-1 font-medium text-orange-700">
              {activity?.correctionReason || 'Please review and adjust your daily report entries.'}
            </div>
            <div className="mt-2 text-[11px] text-orange-600 font-semibold">
              Update the fields below and click "Submit Daily Activity" to resubmit.
            </div>
          </div>
        </div>
      )}

      {isReviewed && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold">This report has been formally reviewed and approved by management.</span>
            {activity?.reviewedAt && (
              <span className="block text-[11px] text-emerald-700 mt-0.5">
                Reviewed on {new Date(activity.reviewedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {isSubmitted && !isReviewed && (
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 flex items-center gap-3 text-sky-900 shadow-xs">
          <Clock className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Your activity report for {selectedDate} is submitted and awaiting manager review.</span>
            <span className="block text-[11px] text-sky-700 mt-0.5">
              If changes are needed, a manager can mark it for correction.
            </span>
          </div>
        </div>
      )}

      {/* 3. Department Specific Fields */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading daily activity...</span>
        </div>
      ) : isDigitalMarketing ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 border border-orange-200 rounded-2xl p-6 text-center text-slate-700 flex flex-col items-center gap-3">
          <div className="p-3 bg-orange-100 text-orange-700 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Digital Marketing Calendar Integration</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              Digital Marketing activities and social media content are scheduled and tracked on the dedicated, interactive Digital Calendar workspace.
            </p>
          </div>
          <a
            href="/digital-calendar"
            className="mt-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>Open Digital Calendar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Department Fields */}
          {isTelecalling && (
            <TelecallingActivityFields
              metrics={formData.metrics}
              outcomes={formData.outcomes}
              onChangeMetrics={(m) => setFormData({ ...formData, metrics: m })}
              onChangeOutcomes={(o) => setFormData({ ...formData, outcomes: o })}
              disabled={isReadOnly}
            />
          )}

          {isDeveloper && (
            <DeveloperActivityFields
              departmentData={formData.departmentData}
              onChangeData={(d) => setFormData({ ...formData, departmentData: d })}
              disabled={isReadOnly}
            />
          )}

          {isManagement && !isTelecalling && (
            <ManagementActivityFields
              departmentData={formData.departmentData}
              onChangeData={(d) => setFormData({ ...formData, departmentData: d })}
              disabled={isReadOnly}
            />
          )}

          {isTrainer && (
            <TrainerActivityFields
              departmentData={formData.departmentData}
              onChangeData={(d) => setFormData({ ...formData, departmentData: d })}
              disabled={isReadOnly}
            />
          )}

          {/* Remarks & Next Steps */}
          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Remarks, Achievements & Blockers</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Log daily highlights, customer challenges, or special remarks..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <ArrowRightCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Next Working Day Priorities & Plan</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.nextSteps || ''}
                onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                placeholder="Key goals, scheduled follow-ups, or targets planned for tomorrow..."
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 focus:bg-white font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Buttons Footer */}
      {!isReadOnly && !isDigitalMarketing && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-5 border-t border-slate-100">
          <button
            type="button"
            disabled={saving || submitting}
            onClick={onSaveDraft}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>{saving ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            disabled={saving || submitting}
            onClick={onSubmitReport}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Daily Activity'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
