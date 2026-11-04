import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiTrash2, FiLoader } from 'react-icons/fi';

export default function DeleteCampaignModal({
  isOpen,
  onClose,
  campaign = '',
  leadCount = 0,
  onConfirm
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const cleanName = String(campaign || '').replace(/_/g, ' ');

  const handleConfirm = async () => {
    setError('');
    setDeleting(true);
    try {
      await onConfirm(campaign);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete campaign');
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50 via-white to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shadow-2xs">
                <FiTrash2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  Delete Campaign
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Admin & Manager Control
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={deleting}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Campaign</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                  @{cleanName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Total Leads in Batch:</span>
                <span className="font-bold text-slate-800">{leadCount} lead{leadCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
              <FiAlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-950">This action is irreversible.</p>
                <p className="text-red-800 text-[11.5px] leading-relaxed">
                  All <span className="font-bold">{leadCount}</span> lead(s), call history, notes, and employee assignments for <span className="font-semibold">"{cleanName}"</span> will be permanently deleted from the database.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Campaign...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="w-3.5 h-3.5" />
                  <span>Delete Campaign</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

