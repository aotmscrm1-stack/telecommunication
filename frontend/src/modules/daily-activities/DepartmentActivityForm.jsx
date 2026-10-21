import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Send,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  ExternalLink,
  MessageSquare,
  ArrowRightCircle,
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import TelecallingActivityFields from './TelecallingActivityFields';
import DeveloperActivityFields from './DeveloperActivityFields';
import ManagementActivityFields from './ManagementActivityFields';
import TrainerActivityFields from './TrainerActivityFields';
import { isCounsellor } from '../../utils/permissions';

export default function DepartmentActivityForm({
  selectedDate,
  activity,
  user,
  viewingEmployee,
  activeDepartment,
  isAdminPreview = false,
  loading = false,
  saving = false,
  submitting = false,
  reviewLoading = false,
  formData,
  setFormData,
  onSaveDraft,
  onSubmitReport,
  onApprove,
  onRequestCorrection,
}) {
  const [showCorrectionBox, setShowCorrectionBox] = React.useState(false);
  const [correctionReason, setCorrectionReason] = React.useState('');

  const department = (activeDepartment || activity?.department || user?.department || 'Development').trim();
  const deptNormalized = department.toLowerCase();

  const targetUser = viewingEmployee || user;
  const isTargetCounsellor = isCounsellor(targetUser) || deptNormalized.includes('councellor') || deptNormalized.includes('counselor');

  const isTelecalling = deptNormalized.includes('telecall') || deptNormalized.includes('caller') || isTargetCounsellor;
  const isDeveloper = !isTelecalling && deptNormalized.includes('dev');
  const isTrainer = !isTelecalling && deptNormalized.includes('train');
  const isDigitalMarketing = !isTelecalling && (deptNormalized.includes('market') || deptNormalized.includes('digital'));
  const isManagement = !isTelecalling && !isDeveloper && !isTrainer && !isDigitalMarketing && (deptNormalized.includes('manage') || deptNormalized.includes('hr') || deptNormalized.includes('admin') || user?.role === 'manager' || user?.role === 'admin');

  const status = activity?.status || 'draft';
  const isSubmitted = status === 'submitted';
  const isReviewed = status === 'reviewed';
  const isNeedsCorrection = status === 'needs_correction';
  const isReadOnly = isSubmitted || isReviewed || isAdminPreview;

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;

  const getStatusBadge = () => {
    if (isReviewed) {
      return (
        <div className="px-3 py-1 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Reviewed & Approved</span>
        </div>
      );
    }
    if (isSubmitted) {
      return (
        <div className="px-3 py-1 text-xs font-bold rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          <span>Submitted (In Review)</span>
        </div>
      );
    }
    if (isNeedsCorrection) {
      return (
        <div className="px-3 py-1 text-xs font-bold rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Correction Requested</span>
        </div>
      );
    }
    return (
      <div className="px-3 py-1 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Draft (In Progress)</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col gap-6 relative">
      {/* 1. Header Information & Identity Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 border border-sky-200/80">
              <Calendar className="w-3 h-3 text-sky-600" />
              <span>{dayName}</span>
            </span>
            {isToday && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider border border-emerald-200">
                Today
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 tracking-tight">
            {formattedDate}
          </h2>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 mt-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] flex items-center justify-center border border-sky-200">
                {((viewingEmployee || user)?.name || 'E')[0]}
              </div>
              <span>{(viewingEmployee || user)?.name || 'Employee'}</span>
              {(viewingEmployee?.staffId || viewingEmployee?.designation) && (
                <span className="text-[11px] text-slate-500 font-normal">
                  ({viewingEmployee.staffId || viewingEmployee.designation})
                </span>
              )}
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                {department}
              </span>
            </div>
            {(viewingEmployee?.designation || user?.designation) && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium text-[11px]">
                  {viewingEmployee?.designation || user.designation}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {getStatusBadge()}
        </div>
      </div>

      {/* 2. Status Banners */}
      <AnimatePresence>
        {isAdminPreview && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-sky-50/90 border border-sky-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-sky-950"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700 flex-shrink-0">
                <Eye className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-sky-900 flex items-center gap-2">
                  <span>Employee Preview Mode</span>
                  {viewingEmployee && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-sky-200 text-sky-800 text-[11px] font-extrabold">
                      {viewingEmployee.name}
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-sky-700 mt-0.5">
                  Inspection mode enabled. Action buttons are locked for employee verification.
                </span>
              </div>
            </div>
            <div className="text-[11px] font-bold text-sky-800 bg-white/80 px-2.5 py-1 rounded-lg border border-sky-200/70">
              Preview Only
            </div>
          </motion.div>
        )}

        {isNeedsCorrection && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex items-start gap-3.5 text-rose-950"
          >
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-rose-900 uppercase tracking-wide">
                Management Revision Requested
              </div>
              <div className="mt-1 font-semibold text-rose-800 text-sm">
                "{activity?.correctionReason || 'Please review and adjust your daily report entries.'}"
              </div>
              <div className="mt-1.5 text-[11px] text-rose-700">
                Update the values below and resubmit for approval.
              </div>
            </div>
          </motion.div>
        )}

        {isReviewed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3.5 text-emerald-950"
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-emerald-900">
                Official Report Approved & Logged
              </span>
              <span className="block text-[11px] text-emerald-700 mt-0.5">
                This daily activity report is approved by management.
                {activity?.reviewedAt && ` (${new Date(activity.reviewedAt).toLocaleDateString()})`}
              </span>
            </div>
          </motion.div>
        )}

        {isSubmitted && !isReviewed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 flex items-center gap-3.5 text-sky-950"
          >
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-sky-900">
                Submitted for Manager Review
              </span>
              <span className="block text-[11px] text-sky-700 mt-0.5">
                Your report for {selectedDate} is in the management review queue.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Department Form Body */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading daily activity...</span>
        </div>
      ) : isDigitalMarketing ? (
        <div className="bg-orange-50/50 border border-orange-200 rounded-3xl p-8 text-center text-slate-700 flex flex-col items-center gap-3">
          <div className="p-3.5 bg-orange-100 text-orange-700 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base">Digital Marketing Calendar Integration</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
              Digital Marketing activities and campaign schedules are tracked on the dedicated Digital Calendar.
            </p>
          </div>
          <a
            href="/digital-calendar"
            className="mt-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <span>Open Digital Calendar</span>
            <ExternalLink className="w-4 h-4" />
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

          {/* 4. Remarks & Priorities Section */}
          <div className="border-t border-slate-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Daily Highlights & Remarks */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-sky-100 text-sky-700">
                  <MessageSquare className="w-3.5 h-3.5" />
                </span>
                <span>Remarks, Achievements & Daily Notes</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Remarks and notes"
                className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition leading-relaxed disabled:bg-slate-100/60"
              />
            </div>

            {/* Next Day Priorities */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700">
                  <ArrowRightCircle className="w-3.5 h-3.5" />
                </span>
                <span>Next Working Day Priorities & Plan</span>
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={formData.nextSteps || ''}
                onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                placeholder="Tomorrow's plan and priorities"
                className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder:text-slate-300 placeholder:font-light focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition leading-relaxed disabled:bg-slate-100/60"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Action Dock Footer */}
      {!isDigitalMarketing && (
        <div className="flex flex-col gap-3 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
              {isAdminPreview ? (
                <span className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100 font-bold">
                  <Eye className="w-4 h-4 text-sky-600" />
                  <span>Admin Preview Mode — Read Only</span>
                </span>
              ) : isReadOnly ? (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Form locked in review mode</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Changes will be saved to your daily history</span>
                </span>
              )}
            </div>

            {/* Admin Review Action Buttons in Preview Mode */}
            {isAdminPreview ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {isSubmitted && !isReviewed && (
                  <>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => onApprove && onApprove(activity?._id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{reviewLoading ? 'Approving...' : 'Approve Report'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => setShowCorrectionBox(true)}
                      className="px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Request Correction</span>
                    </button>
                  </>
                )}
                {isReviewed && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Approved & Verified by Management</span>
                  </div>
                )}
                {!isSubmitted && !isReviewed && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activity ? 'Draft in progress by employee' : 'No report submitted for this date'}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Employee Submit/Save Draft buttons - ONLY when NOT Admin Preview and NOT Read Only */
              !isReadOnly && (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={saving || submitting}
                    onClick={onSaveDraft}
                    className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-slate-600" />
                    <span>{saving ? 'Saving Draft...' : 'Save Draft'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving || submitting}
                    onClick={onSubmitReport}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    }}
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting...' : 'Submit Daily Activity'}</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Inline Request Correction Box for Admin */}
          {showCorrectionBox && (
            <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Specify Revision / Correction Details for Employee:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCorrectionBox(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Please provide your PR link and add ticket number..."
                className="w-full text-xs bg-white border border-amber-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={reviewLoading || !correctionReason.trim()}
                  onClick={() => {
                    if (onRequestCorrection) {
                      onRequestCorrection(activity?._id, correctionReason.trim());
                    }
                    setShowCorrectionBox(false);
                    setCorrectionReason('');
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {reviewLoading ? 'Sending...' : 'Send Correction Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
