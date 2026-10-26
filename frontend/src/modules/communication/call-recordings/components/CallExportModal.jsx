import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { recordingsAPI } from '../../../../services/api';

export default function CallExportModal({
  isOpen,
  onClose,
  filters,
  totalRecords = 0
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await recordingsAPI.exportCsv(filters);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `call_records_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to download CSV export. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1200,
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet style={{ width: '18px', height: '18px' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
              Export Call Records
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px'
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
            Exporting will generate a detailed CSV file containing all call records matching your currently active filters.
          </p>

          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase' }}>
              Export Summary
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginTop: '2px' }}>
              {totalRecords} records to export
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Includes: Contact Phone, Lead Name, Agent, Date, Duration, Status, and Transcript Status.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={downloading}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={downloading}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: downloading ? 0.7 : 1
              }}
            >
              <Download style={{ width: '15px', height: '15px' }} />
              {downloading ? 'Generating CSV...' : 'Download CSV'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
