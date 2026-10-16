import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Building2,
  Calendar,
  Phone,
  FileText,
  History,
  Send,
} from 'lucide-react';
import { dailyActivityAPI } from '../../services/api';

export default function ActivityReportDrawer({
  reportId,
  onClose,
  onReviewSuccess,
}) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review action state
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  React.useEffect(() => {
    if (!reportId) return;
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dailyActivityAPI.getOne(reportId);
      if (res.data?.success) {
        setActivity(res.data.activity);
      } else {
        setError(res.data?.message || 'Failed to load report.');
      }
    } catch (err) {
      console.error('Failed to load report details:', err);
      setError(err.response?.data?.message || 'Error loading report.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setActionError('');
      const res = await dailyActivityAPI.reviewActivity(reportId, {
        status: 'reviewed',
      });
      if (res.data?.success) {
        if (onReviewSuccess) onReviewSuccess();
        onClose();
      } else {
        setActionError(res.data?.message || 'Approval failed.');
      }
    } catch (err) {
      console.error('Approve error:', err);
      setActionError(err.response?.data?.message || 'Failed to approve report.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!correctionReason.trim() || correctionReason.trim().length < 5) {
      setActionError('Please provide a specific correction reason (at least 5 characters).');
      return;
    }

    try {
      setActionLoading(true);
      setActionError('');
      const res = await dailyActivityAPI.reviewActivity(reportId, {
        status: 'needs_correction',
        correctionReason: correctionReason.trim(),
      });
      if (res.data?.success) {
        if (onReviewSuccess) onReviewSuccess();
        onClose();
      } else {
        setActionError(res.data?.message || 'Correction request failed.');
      }
    } catch (err) {
      console.error('Correction request error:', err);
      setActionError(err.response?.data?.message || 'Failed to request correction.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!reportId) return null;

  const emp = activity?.employee || {};
  const metrics = activity?.metrics || {};
  const outcomes = activity?.outcomes || [];
  const revisions = activity?.revisions || [];
  const status = activity?.status;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Daily Activity Report Inspection</span>
            </h3>
            <span className="text-xs text-slate-500">
              Audit and verify employee daily activity submission
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading report details...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* Employee & Meta Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 font-extrabold flex items-center justify-center text-sm border border-sky-200">
                    {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{emp.name || 'Employee'}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{emp.email}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{emp.department || activity?.department}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>{activity?.activityDate}</span>
                  </div>
                  <div className="mt-1">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        status === 'reviewed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'submitted'
                          ? 'bg-sky-100 text-sky-800'
                          : status === 'needs_correction'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Correction Reason Alert if applicable */}
              {activity?.correctionReason && (
                <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Correction Feedback:</span> {activity.correctionReason}
                  </div>
                </div>
              )}

              {/* Calling Metrics (if Telecalling) */}
              {metrics && metrics.callsAttempted !== undefined && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-sky-600" />
                    <span>Calling Performance Metrics</span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Attempted</div>
                      <div className="text-base font-extrabold text-slate-900">{metrics.callsAttempted || 0}</div>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">Connected</div>
                      <div className="text-base font-extrabold text-emerald-900">{metrics.connectedCalls || 0}</div>
                    </div>
                    <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                      <div className="text-[10px] text-rose-700 font-semibold uppercase">Unanswered</div>
                      <div className="text-base font-extrabold text-rose-900">{metrics.unansweredCalls || 0}</div>
                    </div>
                    <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 text-center">
                      <div className="text-[10px] text-sky-700 font-semibold uppercase">Interested</div>
                      <div className="text-base font-extrabold text-sky-900">{metrics.interestedLeads || 0}</div>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                      <div className="text-[10px] text-amber-700 font-semibold uppercase">Follow-ups</div>
                      <div className="text-base font-extrabold text-amber-900">{metrics.followUpsScheduled || 0}</div>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-center">
                      <div className="text-[10px] text-purple-700 font-semibold uppercase">Converted</div>
                      <div className="text-base font-extrabold text-purple-900">{metrics.conversions || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Department Specific Data (if Developer / Trainer / Management) */}
              {activity?.departmentData && Object.keys(activity.departmentData).length > 0 && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Department Log Payload
                  </h4>
                  <div className="space-y-1.5 text-slate-700">
                    {Object.entries(activity.departmentData).map(([k, v]) => (
                      <div key={k} className="flex flex-col sm:flex-row sm:gap-2">
                        <span className="font-semibold text-slate-500 capitalize">{k}:</span>
                        <span className="font-medium text-slate-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lead Call Outcomes */}
              {outcomes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                    Lead Call Outcomes ({outcomes.length})
                  </h4>
                  <div className="space-y-2">
                    {outcomes.map((out, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{out.leadName || 'Contact Lead'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold text-[10px]">
                            {out.category}
                          </span>
                        </div>
                        {out.followUpAt && (
                          <div className="text-[11px] text-amber-700 font-medium">
                            Scheduled Callback: {new Date(out.followUpAt).toLocaleString()}
                          </div>
                        )}
                        {out.notes && (
                          <div className="text-slate-600 text-[11px] mt-0.5">{out.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks & Next Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700 uppercase mb-1">Remarks & Achievements</div>
                  <p className="text-slate-600 whitespace-pre-wrap">{activity?.remarks || '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700 uppercase mb-1">Next Day Priorities</div>
                  <p className="text-slate-600 whitespace-pre-wrap">{activity?.nextSteps || '—'}</p>
                </div>
              </div>

              {/* Audit Revision History */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Audit Trail & Revision History</span>
                </h4>
                <div className="space-y-1.5">
                  {revisions.length === 0 ? (
                    <div className="text-slate-400 text-xs italic">No revision logs recorded.</div>
                  ) : (
                    revisions.map((rev, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{rev.changesSummary}</span>
                        </div>
                        <span className="text-slate-400 flex-shrink-0">
                          {new Date(rev.editedAt).toLocaleDateString()}{' '}
                          {new Date(rev.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col gap-3">
          {actionError && (
            <div className="text-rose-600 text-xs font-semibold">{actionError}</div>
          )}

          {showCorrectionInput ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-orange-900 block">
                Reason for Requesting Correction: <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain what needs adjustment (e.g. Please add detailed notes for the 2 conversions)..."
                className="w-full text-xs p-2 bg-white border border-orange-300 rounded-xl focus:outline-none focus:border-orange-500"
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowCorrectionInput(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleRequestCorrection}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  {actionLoading ? 'Submitting...' : 'Confirm Request Correction'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowCorrectionInput(true)}
                  className="px-4 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Request Correction</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || status === 'reviewed'}
                  onClick={handleApprove}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Processing...' : status === 'reviewed' ? 'Approved' : 'Approve Report'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
