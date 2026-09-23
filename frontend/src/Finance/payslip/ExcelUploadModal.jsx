import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Info,
  ArrowRight,
} from 'lucide-react';
import {
  generatePayslipExcelTemplate,
  parseAndValidatePayslipExcel,
} from '../../utils/excelTemplate';

export default function ExcelUploadModal({ isOpen, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterView, setFilterView] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Automatically clear and reset state every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setParsing(false);
      setImporting(false);
      setParseResult(null);
      setErrorMessage('');
      setFilterView('all');
      setIsDragOver(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  const handleClose = () => {
    setFile(null);
    setParsing(false);
    setImporting(false);
    setParseResult(null);
    setErrorMessage('');
    setFilterView('all');
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setErrorMessage('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    setParsing(true);
    setParseResult(null);

    try {
      const result = await parseAndValidatePayslipExcel(selectedFile);
      setParseResult(result);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setErrorMessage(err.message || 'Failed to parse Excel file');
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setErrorMessage('');
    setFilterView('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.validRows || parseResult.validRows.length === 0) {
      setErrorMessage('No valid employee records to import');
      return;
    }

    setImporting(true);
    setErrorMessage('');
    try {
      await onImportSuccess(parseResult.validRows);
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save payslips');
    } finally {
      setImporting(false);
    }
  };

  const displayedRows = (parseResult?.allRows || []).filter((r) => {
    if (filterView === 'valid') return r.isValid;
    if (filterView === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn border border-gray-200">
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                Upload Excel for Bulk Payslips
              </h3>
              <p className="text-xs text-gray-500">
                Download the standardized template, populate multiple employee records, and generate individual payslips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body ──────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Template Download Card */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-sky-50/80 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-indigo-950">
                  Step 1: Download Standard Payslip Template
                </h4>
                <p className="text-xs text-indigo-700/90 leading-relaxed">
                  Contains all official fields, salary deduction rules, example rows, and guidance.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePayslipExcelTemplate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer flex-shrink-0"
            >
              <Download className="w-4 h-4" /> Download Template (.xlsx)
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step 2: Upload Zone */}
          {!parseResult && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer bg-white ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                {parsing ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">
                {parsing ? 'Reading & Validating Excel Data...' : 'Step 2: Upload Completed Excel File'}
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                Drag and drop your Excel spreadsheet (.xlsx, .xls) here, or click to browse
              </p>
              <span className="inline-block text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                Supported formats: .xlsx, .xls
              </span>
            </div>
          )}

          {/* Step 3: Validation Summary & Row Review Table */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-semibold text-gray-500">Total Rows</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{parseResult.totalRows}</div>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid Records
                  </div>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{parseResult.validCount}</div>
                </div>
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 shadow-xs">
                  <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Invalid Records
                  </div>
                  <div className="text-xl font-bold text-rose-800 mt-1">{parseResult.invalidCount}</div>
                </div>
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
                  <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Duplicates
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-1">{parseResult.duplicateCount}</div>
                </div>
              </div>

              {/* Table Filters & Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 mr-1">Filter View:</span>
                  <button
                    type="button"
                    onClick={() => setFilterView('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      filterView === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({parseResult.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('valid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      filterView === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Valid ({parseResult.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('invalid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      filterView === 'invalid'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Invalid ({parseResult.invalidCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Upload Another File
                  </button>
                </div>
              </div>

              {/* Table of Rows */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold text-[10.5px] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Emp ID</th>
                        <th className="py-2.5 px-3">Month</th>
                        <th className="py-2.5 px-3 text-right">Gross</th>
                        <th className="py-2.5 px-3 text-right">Net Pay</th>
                        <th className="py-2.5 px-3">Issues / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-gray-400 text-xs">
                            No records matching filter
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-gray-50 transition-colors ${
                              !row.isValid ? 'bg-rose-50/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-gray-500 font-bold">
                              #{row.rowNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800">
                                  <AlertCircle className="w-3 h-3" /> Invalid
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">
                              {row.data.employee_name || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-indigo-600">
                              {row.data.employee_id || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {row.data.payslip_month || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                              ₹{Number(row.data.gross_salary || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                              {row.isValid
                                ? `₹${Number(row.calculated?.net_salary || 0).toLocaleString('en-IN')}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.errors.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.errors.map((err, i) => (
                                    <span
                                      key={i}
                                      className="inline-block px-1.5 py-0.5 mr-1 mb-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700"
                                    >
                                      {err}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">
            {parseResult ? (
              <span>
                {parseResult.validCount} of {parseResult.totalRows} records ready for generation
              </span>
            ) : (
              <span>Upload an Excel file to see live validation</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {parseResult && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parseResult.validCount === 0 || importing}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving & Generating Payslips...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Generate & Save {parseResult.validCount} Payslip{parseResult.validCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
