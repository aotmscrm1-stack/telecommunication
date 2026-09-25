import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  FiUploadCloud, FiDownload, FiPlus, FiSearch, FiRefreshCw,
  FiTrash2, FiEye, FiCheckCircle, FiAlertCircle, FiClock,
  FiSend, FiUsers, FiX, FiFileText, FiPhone, FiMail,
  FiCheck, FiChevronRight, FiCopy, FiExternalLink, FiFilter,
  FiEdit2, FiInfo, FiLayers, FiCheckSquare
} from 'react-icons/fi';
import { RiWhatsappFill, RiFileExcel2Fill, RiFileExcel2Line } from 'react-icons/ri';
import { whatsappCampaignsAPI, messageTemplatesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/permissions';

// ── Color Theme (WhatsApp Emerald + Modern Indigo/Slate) ─────────────────────
const WA_COLOR = '#25D366';
const WA_DARK = '#128C7E';
const WA_BG = '#f0fdf4';
const WA_LINE = '#bbf7d0';

const C = {
  primary: '#25D366',
  primaryDark: '#128C7E',
  primaryHover: '#1eb857',
  indigo: '#4f46e5',
  indigoLight: '#eef2ff',
  indigoBorder: '#c7d2fe',
  slateDark: '#0f172a',
  slateMuted: '#64748b',
  slateLight: '#f8fafc',
  border: '#e2e8f0',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
};

export default function WhatsAppCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalCampaigns: 0, totalContacts: 0, totalSent: 0, totalFailed: 0, totalValid: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [viewDetailModal, setViewDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await whatsappCampaignsAPI.getAll({
        search,
        status: statusFilter,
        page,
        limit: 15,
      });
      setCampaigns(res.data.campaigns || []);
      setSummary(res.data.summary || {});
      setTotalPages(Math.ceil((res.data.total || 0) / 15) || 1);
    } catch (err) {
      console.error('Failed to load WhatsApp campaigns:', err);
      showToast(err.response?.data?.message || 'Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [search, statusFilter, page]);

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await whatsappCampaignsAPI.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'whatsapp_campaign_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Excel template downloaded successfully');
    } catch (err) {
      // Fallback local XLSX generation if backend endpoint fails
      const sample = [
        { identity: 'EMP001', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@example.com' },
        { identity: 'EMP002', name: 'Priya Patel', phone: '9876543211', email: 'priya.patel@example.com' },
        { identity: 'EMP003', name: 'Amit Kumar', phone: '9876543212', email: 'amit.kumar@example.com' },
        { identity: 'EMP004', name: 'Sneha Reddy', phone: '9876543213', email: 'sneha.reddy@example.com' },
      ];
      const ws = XLSX.utils.json_to_sheet(sample, { header: ['identity', 'name', 'phone', 'email'] });
      ws['!cols'] = [{ wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'WhatsApp_Template');
      XLSX.writeFile(wb, 'whatsapp_campaign_template.xlsx');
      showToast('Excel template generated and downloaded');
    }
  };

  // Open Campaign Details Modal
  const handleOpenDetail = async (campId) => {
    setViewDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await whatsappCampaignsAPI.getOne(campId);
      setSelectedCampaign(res.data.campaign);
    } catch (err) {
      showToast('Failed to load campaign details', 'error');
      setViewDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campId, campName) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${campName}"? This will remove all associated audience data.`)) {
      return;
    }
    try {
      await whatsappCampaignsAPI.delete(campId);
      showToast('Campaign deleted successfully');
      fetchCampaigns();
      if (selectedCampaign?._id === campId) {
        setViewDetailModal(false);
        setSelectedCampaign(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete campaign', 'error');
    }
  };

  // Export Audience
  const handleExportAudience = async (camp) => {
    try {
      const res = await whatsappCampaignsAPI.exportAudience(camp._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${camp.name.replace(/\s+/g, '_')}_audience.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Campaign audience exported');
    } catch (err) {
      showToast('Failed to export audience', 'error');
    }
  };

  // Dispatch / Send Campaign
  const handleSendCampaign = async (campId) => {
    if (!window.confirm('Are you sure you want to launch this WhatsApp broadcast campaign to all pending contacts?')) {
      return;
    }
    try {
      showToast('Launching broadcast...', 'info');
      const res = await whatsappCampaignsAPI.send(campId);
      showToast(res.data.message || 'WhatsApp broadcast dispatched successfully');
      fetchCampaigns();
      if (selectedCampaign?._id === campId) {
        handleOpenDetail(campId);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to launch broadcast', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toast.type === 'error' ? <FiAlertCircle className="w-5 h-5 text-red-500" /> : <FiCheckCircle className="w-5 h-5 text-emerald-600" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <FiX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Top Header Bar ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <RiWhatsappFill className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-800">WhatsApp Campaign</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Excel Audience Module
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Upload Excel contacts with Identity, Name, Phone & Email to save in database and run WhatsApp campaigns.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Download Template Button */}
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
              title="Download Excel template with identity, name, phone, email"
            >
              <RiFileExcel2Line className="w-4 h-4 text-emerald-600" />
              <span>Download Excel Template</span>
            </button>

            {/* Upload Campaign Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-md shadow-emerald-600/25"
            >
              <FiUploadCloud className="w-4 h-4" />
              <span>Upload Excel Campaign</span>
            </button>
          </div>
        </div>

        {/* ── Summary Stats Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
              <FiLayers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Campaigns</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{summary.totalCampaigns || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
              <FiUsers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saved Audience</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{summary.totalContacts || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xl">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Contacts</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{summary.totalValid || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
              <FiSend className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivered Messages</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{summary.totalSent || 0}</h3>
            </div>
          </div>
        </div>

        {/* ── Search, Filters & Action Row ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search campaigns or file..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <FiFilter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="sending">Sending</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <button
              onClick={fetchCampaigns}
              title="Refresh Campaigns"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Campaigns Table / List ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-500">Loading WhatsApp campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center space-y-4 px-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <RiWhatsappFill className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No WhatsApp Campaigns Found</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Get started by downloading the Excel template and uploading your contacts list with Identity, Name, Phone, and Email.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                >
                  Download Template
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
                >
                  Upload First Campaign
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Campaign Info</th>
                    <th className="py-3.5 px-4">Excel Source</th>
                    <th className="py-3.5 px-4 text-center">Audience Size</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Progress</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((camp) => (
                    <tr key={camp._id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Campaign Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span>{camp.name}</span>
                          {camp.templateRef?.shortcut && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-medium border border-indigo-100">
                              /{camp.templateRef.shortcut}
                            </span>
                          )}
                        </div>
                        {camp.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{camp.description}</p>
                        )}
                      </td>

                      {/* Source Excel File */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <RiFileExcel2Fill className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[140px]" title={camp.fileName}>
                            {camp.fileName || 'Excel Sheet'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {camp.fileSize ? `${Math.round(camp.fileSize / 1024)} KB` : 'Uploaded'}
                        </span>
                      </td>

                      {/* Audience Size */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-800 text-sm">{camp.totalCount || 0}</span>
                          <span className="text-[11px] text-emerald-600 font-medium">
                            {camp.validCount || 0} valid
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            camp.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : camp.status === 'sending'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : camp.status === 'failed'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            camp.status === 'completed' ? 'bg-emerald-500' : camp.status === 'sending' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <span className="capitalize">{camp.status}</span>
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-4 px-4 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${camp.totalCount ? Math.min(100, Math.round(((camp.sentCount || 0) / camp.totalCount) * 100)) : 0}%` }}
                            />
                            {camp.failedCount > 0 && (
                              <div
                                className="bg-red-400 h-full"
                                style={{ width: `${camp.totalCount ? Math.min(100, Math.round(((camp.failedCount || 0) / camp.totalCount) * 100)) : 0}%` }}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-500">
                            {camp.sentCount || 0} / {camp.totalCount || 0} sent
                          </span>
                        </div>
                      </td>

                      {/* Created By / Date */}
                      <td className="py-4 px-4 text-xs text-slate-500">
                        <div>{new Date(camp.createdAt).toLocaleDateString('en-GB')}</div>
                        <div className="text-[11px] text-slate-400">{camp.createdBy?.name || 'Admin'}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Audience Details */}
                          <button
                            onClick={() => handleOpenDetail(camp._id)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Campaign Audience & Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>

                          {/* Export */}
                          <button
                            onClick={() => handleExportAudience(camp)}
                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Export Audience to Excel"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>

                          {/* Launch Broadcast */}
                          <button
                            onClick={() => handleSendCampaign(camp._id)}
                            className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors"
                            title="Launch WhatsApp Broadcast"
                          >
                            <FiSend className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {canDelete(user) && (
                            <button
                              onClick={() => handleDeleteCampaign(camp._id, camp.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Campaign"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Upload Excel Campaign ────────────────────────────────── */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadCampaignModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={(newCamp) => {
              setShowUploadModal(false);
              showToast('WhatsApp campaign uploaded and stored in database successfully!');
              fetchCampaigns();
              if (newCamp?._id) {
                handleOpenDetail(newCamp._id);
              }
            }}
            onDownloadTemplate={handleDownloadTemplate}
          />
        )}
      </AnimatePresence>

      {/* ── Modal: Campaign Detail & Audience Viewer ────────────────────── */}
      <AnimatePresence>
        {viewDetailModal && (
          <CampaignDetailModal
            campaign={selectedCampaign}
            loading={detailLoading}
            onClose={() => { setViewDetailModal(false); setSelectedCampaign(null); }}
            onRefresh={() => selectedCampaign && handleOpenDetail(selectedCampaign._id)}
            onExport={() => selectedCampaign && handleExportAudience(selectedCampaign)}
            onSend={() => selectedCampaign && handleSendCampaign(selectedCampaign._id)}
            onToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Upload Campaign Modal Component ─────────────────────────────────────────
function UploadCampaignModal({ onClose, onSuccess, onDownloadTemplate }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Client-side Excel parsing preview
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [validRows, setValidRows] = useState(0);
  const [invalidRows, setInvalidRows] = useState(0);
  const [detectedCols, setDetectedCols] = useState({ identity: false, name: false, phone: false, email: false });
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Message Templates for WhatsApp
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const res = await messageTemplatesAPI.getAll({ type: 'whatsapp' });
        setTemplates(res.data.templates || res.data || []);
      } catch (err) {
        console.warn('Could not load message templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  // When a template is selected, fill default message
  const handleTemplateChange = (tmplId) => {
    setTemplateId(tmplId);
    const tmpl = templates.find(t => t._id === tmplId);
    if (tmpl) {
      setCustomMessage(tmpl.message || '');
    }
  };

  // Parse Excel File on Selection
  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }

    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('Excel file seems empty');
          setParsing(false);
          return;
        }

        // Find header row
        const scanLimit = Math.min(rawJson.length, 10);
        let bestIdx = 0;
        let bestScore = -1;
        for (let i = 0; i < scanLimit; i++) {
          const row = (rawJson[i] || []).map(cell => String(cell).toLowerCase().trim());
          let score = 0;
          row.forEach(cell => {
            if (/identity|id|reg|roll|identifier/i.test(cell)) score += 3;
            if (/name|fullname/i.test(cell)) score += 3;
            if (/phone|mobile|contact|whatsapp/i.test(cell)) score += 3;
            if (/email|mail/i.test(cell)) score += 3;
          });
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        }

        const headers = (rawJson[bestIdx] || []).map(h => String(h).trim());
        let idIdx = -1, nameIdx = -1, phoneIdx = -1, emailIdx = -1;

        headers.forEach((h, idx) => {
          const str = h.toLowerCase();
          if (idIdx === -1 && /identity|id|roll|reg|identifier|code/i.test(str)) idIdx = idx;
          if (nameIdx === -1 && /name|fullname/i.test(str)) nameIdx = idx;
          if (phoneIdx === -1 && /phone|mobile|contact|whatsapp/i.test(str)) phoneIdx = idx;
          if (emailIdx === -1 && /email|mail/i.test(str)) emailIdx = idx;
        });

        // Fallbacks
        if (idIdx === -1) idIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (phoneIdx === -1) phoneIdx = 2;
        if (emailIdx === -1) emailIdx = 3;

        setDetectedCols({
          identity: idIdx !== -1,
          name: nameIdx !== -1,
          phone: phoneIdx !== -1,
          email: emailIdx !== -1,
        });

        const rows = [];
        let valid = 0, invalid = 0;

        for (let i = bestIdx + 1; i < rawJson.length; i++) {
          const r = rawJson[i] || [];
          if (!r.some(c => String(c).trim() !== '')) continue;

          let identityVal = idIdx !== -1 && r[idIdx] !== undefined ? String(r[idIdx]).trim() : '';
          const nameVal = nameIdx !== -1 && r[nameIdx] !== undefined ? String(r[nameIdx]).trim() : '';
          const phoneVal = phoneIdx !== -1 && r[phoneIdx] !== undefined ? String(r[phoneIdx]).trim() : '';
          const emailVal = emailIdx !== -1 && r[emailIdx] !== undefined ? String(r[emailIdx]).trim() : '';

          if (!identityVal && nameVal) identityVal = `ID-${i + 1}`;

          const cleanPhone = phoneVal.replace(/\D/g, '');
          const isRowValid = Boolean(cleanPhone.length >= 7 && (nameVal || identityVal));

          if (isRowValid) valid++; else invalid++;

          rows.push({
            identity: identityVal || `ROW-${i + 1}`,
            name: nameVal || 'N/A',
            phone: phoneVal || 'N/A',
            email: emailVal || '',
            isValid: isRowValid,
          });
        }

        setPreviewRows(rows.slice(0, 5));
        setTotalRows(rows.length);
        setValidRows(valid);
        setInvalidRows(invalid);
      } catch (err) {
        console.error('Error parsing excel:', err);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select an Excel or CSV file to upload.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      if (templateId) formData.append('templateId', templateId);
      if (customMessage) formData.append('customMessage', customMessage);

      const res = await whatsappCampaignsAPI.upload(formData);
      onSuccess(res.data.campaign);
    } catch (err) {
      console.error('Upload error:', err);
      alert(err.response?.data?.message || 'Failed to upload and store WhatsApp campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <RiWhatsappFill className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Upload WhatsApp Campaign Excel</h2>
              <p className="text-xs text-slate-500">
                Audience columns: <strong className="text-emerald-700">identity, name, phone, email</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Campaign Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. March Offer Blast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Outreach for web development leads"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Excel File Drop Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Excel File (.xlsx, .xls, .csv) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
              >
                <FiDownload className="w-3.5 h-3.5" />
                <span>Download Sample Sheet</span>
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => processFile(e.target.files?.[0])}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <RiFileExcel2Fill className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">{Math.round(file.size / 1024)} KB • Click or drag to change file</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <FiUploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Click to browse or drag & drop Excel file</p>
                    <p className="text-xs text-slate-400 mt-0.5">Must include: Identity, Name, Phone, Email</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Parsed Preview */}
          {parsing ? (
            <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Excel structure...</span>
            </div>
          ) : totalRows > 0 ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Audience Detected:</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 font-semibold text-slate-800">{totalRows} Rows</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 font-semibold text-emerald-800">{validRows} Valid</span>
                  {invalidRows > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 font-semibold text-red-800">{invalidRows} Invalid</span>
                  )}
                </div>
              </div>

              {/* Column Mapping Badges */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
                <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Column 1</span>
                  Identity ✓
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Column 2</span>
                  Name ✓
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Column 3</span>
                  Phone ✓
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <span className="block text-[10px] text-slate-400 uppercase">Column 4</span>
                  Email ✓
                </div>
              </div>

              {/* Sample Preview Rows */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-slate-400 uppercase bg-slate-100/80">
                    <tr>
                      <th className="py-1.5 px-2">Identity</th>
                      <th className="py-1.5 px-2">Name</th>
                      <th className="py-1.5 px-2">Phone</th>
                      <th className="py-1.5 px-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 bg-white">
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-mono font-medium text-slate-700">{r.identity}</td>
                        <td className="py-1.5 px-2 text-slate-800">{r.name}</td>
                        <td className="py-1.5 px-2 text-slate-700">{r.phone}</td>
                        <td className="py-1.5 px-2 text-slate-500">{r.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Template / Message Option */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Link Message Template <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
            </div>
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">-- Select from Message Templates --</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>
                  /{t.shortcut} {t.name ? `- ${t.name}` : ''}
                </option>
              ))}
            </select>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Broadcast Message Preview / Custom Text
              </label>
              <textarea
                rows={3}
                placeholder="Hello {{name}} (ID: {{identity}}), thank you for connecting with us! Contact: {{phone}}"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Supported dynamic tags: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">{'{{name}}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">{'{{identity}}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">{'{{phone}}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">{'{{email}}'}</code>
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-4 h-4" />
                  <span>Upload & Save to Database</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Campaign Detail & Audience Modal Component ──────────────────────────────
function CampaignDetailModal({ campaign, loading, onClose, onRefresh, onExport, onSend, onToast }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [contactSearch, setContactSearch] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ identity: '', name: '', phone: '', email: '' });
  const [addingContact, setAddingContact] = useState(false);

  if (!campaign && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const contacts = campaign.contacts || [];

  const filteredContacts = contacts.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      return (
        c.identity?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.identity || !newContact.name || !newContact.phone) {
      alert('Please fill identity, name, and phone.');
      return;
    }
    setAddingContact(true);
    try {
      await whatsappCampaignsAPI.addContact(campaign._id, newContact);
      onToast('Contact added to campaign successfully');
      setNewContact({ identity: '', name: '', phone: '', email: '' });
      setShowAddContact(false);
      onRefresh();
    } catch (err) {
      onToast(err.response?.data?.message || 'Failed to add contact', 'error');
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm('Delete this contact from the campaign audience?')) return;
    try {
      await whatsappCampaignsAPI.deleteContact(campaign._id, contactId);
      onToast('Contact removed');
      onRefresh();
    } catch (err) {
      onToast('Failed to remove contact', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <RiWhatsappFill className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">{campaign.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  {campaign.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Source: <strong className="text-slate-700">{campaign.fileName}</strong> • Created on {new Date(campaign.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
              title="Export Audience"
            >
              <FiDownload className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              onClick={onSend}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              title="Launch WhatsApp Broadcast"
            >
              <FiSend className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors ml-1"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Campaign Metrics Sub-bar */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/50 divide-x divide-slate-200 text-center py-2.5 px-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Audience</span>
            <span className="font-bold text-slate-800 text-sm">{campaign.totalCount || contacts.length}</span>
          </div>
          <div>
            <span className="text-emerald-500 block text-[10px] uppercase font-semibold">Valid</span>
            <span className="font-bold text-emerald-700 text-sm">{campaign.validCount || 0}</span>
          </div>
          <div>
            <span className="text-blue-500 block text-[10px] uppercase font-semibold">Sent</span>
            <span className="font-bold text-blue-700 text-sm">{campaign.sentCount || 0}</span>
          </div>
          <div>
            <span className="text-red-500 block text-[10px] uppercase font-semibold">Failed / Invalid</span>
            <span className="font-bold text-red-700 text-sm">{(campaign.failedCount || 0) + (campaign.invalidCount || 0)}</span>
          </div>
        </div>

        {/* Message Banner if template or custom message exists */}
        {(campaign.customMessage || campaign.templateRef?.message) && (
          <div className="p-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
            <FiInfo className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-emerald-800">Campaign Message Body: </span>
              <span>{campaign.customMessage || campaign.templateRef?.message}</span>
            </div>
          </div>
        )}

        {/* Contacts Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search audience..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Contacts ({contacts.length})</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="invalid">Invalid</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddContact(p => !p)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span>Add Single Contact</span>
          </button>
        </div>

        {/* Inline Add Contact Form */}
        <AnimatePresence>
          {showAddContact && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddContact}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">Identity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ID-109"
                  value={newContact.identity}
                  onChange={(e) => setNewContact(c => ({ ...c, identity: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact(c => ({ ...c, name: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="10-digit number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact(c => ({ ...c, phone: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">Email</label>
                <input
                  type="email"
                  placeholder="name@email.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact(c => ({ ...c, email: e.target.value }))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={addingContact}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  {addingContact ? 'Adding...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddContact(false)}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Contacts Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No contacts match your current filter/search.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase sticky top-0 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Identity</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map((c, i) => (
                  <tr key={c._id || i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold">
                        {c.identity}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <FiPhone className="w-3 h-3 text-emerald-600" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {c.email ? (
                        <div className="flex items-center gap-1.5">
                          <FiMail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          c.status === 'sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : c.status === 'invalid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.error && (
                        <span className="block text-[9px] text-red-500 mt-0.5" title={c.error}>
                          {c.error}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteContact(c._id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Remove contact"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredContacts.length} of {contacts.length} saved contacts</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
