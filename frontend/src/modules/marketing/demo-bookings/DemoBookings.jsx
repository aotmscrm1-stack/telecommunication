import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowRotateRight, FaMagnifyingGlass, FaPhone, FaWhatsapp, FaTrash,
  FaCalendarCheck, FaInbox, FaClock, FaChevronLeft, FaChevronRight,
  FaDownload, FaXmark, FaCircleCheck, FaUserGroup, FaNoteSticky, FaSpinner,
} from 'react-icons/fa6';
import { demoBookingsAPI } from '../../../services/api';

const T = {
  bg: '#f8fafc',
  card: '#ffffff',
  ink: '#0f172a',
  soft: '#475569',
  muted: '#94a3b8',
  line: '#e2e8f0',
  lineSoft: '#f1f5f9',
  blue: '#0284c7',
  blueSoft: 'rgba(2, 132, 199, 0.10)',
  orange: '#f97316',
};

const STATUS_META = {
  new: { label: 'New', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  contacted: { label: 'Contacted', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
  scheduled: { label: 'Scheduled', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc' },
  completed: { label: 'Completed', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  cancelled: { label: 'Cancelled', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

const STATUS_ORDER = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const fmtRelative = (value) => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '—';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'NA';

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.new;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 20,
        padding: '16px 18px',
        boxShadow: '0 3px 18px -6px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: tone.bg,
          border: `1px solid ${tone.border}`,
          color: tone.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 18, height: 18 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.muted }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {value}
        </div>
        {hint && <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{hint}</div>}
      </div>
    </motion.div>
  );
}

export default function DemoBookings() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [active, setActive] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadStats = useCallback(async () => {
    try {
      const res = await demoBookingsAPI.getStats();
      setStats(res?.data?.stats || null);
    } catch {
      /* stats are non-blocking */
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (rangeFilter) params.range = rangeFilter;
      if (search) params.search = search;

      const res = await demoBookingsAPI.getAll(params);
      const body = res?.data || {};
      setBookings(Array.isArray(body.bookings) ? body.bookings : []);
      setPagination(body.pagination || { page: 1, pages: 1, total: 0, limit: 20 });
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load demo bookings.', 'error');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, rangeFilter, search]);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const refresh = () => {
    loadBookings();
    loadStats();
  };

  const changeStatus = async (booking, status) => {
    if (!booking || booking.status === status) return;
    try {
      await demoBookingsAPI.updateStatus(booking._id, status);
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, status } : b)));
      if (active?._id === booking._id) setActive((prev) => ({ ...prev, status }));
      notify(`Marked as ${STATUS_META[status]?.label || status}.`);
      loadStats();
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not update status.', 'error');
    }
  };

  const saveNotes = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await demoBookingsAPI.update(active._id, { notes: noteDraft });
      setBookings((prev) => prev.map((b) => (b._id === active._id ? { ...b, notes: noteDraft } : b)));
      setActive((prev) => ({ ...prev, notes: noteDraft }));
      notify('Notes saved.');
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not save notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeBooking = async (booking) => {
    if (!booking) return;
    if (!window.confirm(`Delete the demo request from ${booking.name}? This cannot be undone.`)) return;
    try {
      await demoBookingsAPI.remove(booking._id);
      setBookings((prev) => prev.filter((b) => b._id !== booking._id));
      setActive(null);
      notify('Demo request deleted.');
      loadStats();
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not delete the request.', 'error');
    }
  };

  const exportCsv = () => {
    if (bookings.length === 0) {
      notify('Nothing to export yet.', 'error');
      return;
    }
    const header = ['Name', 'Mobile', 'Scheduled At', 'Message', 'Status', 'Received'];
    const rows = bookings.map((b) => [
      b.name, b.mobile, fmtDateTime(b.scheduledAt),
      String(b.message || '').replace(/[\r\n]+/g, ' '),
      STATUS_META[b.status]?.label || b.status, fmtDateTime(b.createdAt),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `demo-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('CSV exported.');
  };

  const openDetail = (booking) => {
    setActive(booking);
    setNoteDraft(booking.notes || '');
  };

  const summary = useMemo(() => {
    const byStatus = stats?.byStatus || {};
    return {
      total: stats?.total ?? pagination.total ?? 0,
      today: stats?.today ?? 0,
      upcoming: stats?.upcoming ?? 0,
      fresh: byStatus.new ?? 0,
    };
  }, [stats, pagination.total]);

  const FILTERS = [
    { id: 'all', label: 'All' },
    ...STATUS_ORDER.map((s) => ({ id: s, label: STATUS_META[s].label })),
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '24px 20px 48px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 34, height: 34, borderRadius: 11,
                  background: 'linear-gradient(135deg, #0284c7 0%, #f97316 130%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(2, 132, 199, 0.28)',
                }}
              >
                <FaCalendarCheck style={{ width: 16, height: 16 }} />
              </div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: '-0.02em' }}>
                Client Demos Booked
              </h1>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: T.soft }}>
              Every free-demo request submitted from the public landing page — with all required contact details.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <motion.button
              whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
              onClick={refresh}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
                borderRadius: 11, border: `1px solid ${T.line}`, background: T.card,
                color: T.blue, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <FaArrowRotateRight style={{ width: 12, height: 12 }} className={loading ? 'animate-spin' : ''} />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
              onClick={exportCsv}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
                borderRadius: 11, border: '1px solid #fdba74', background: '#fff7ed',
                color: '#c2410c', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <FaDownload style={{ width: 12, height: 12 }} />
              Export CSV
            </motion.button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 18 }}>
          <StatCard label="Total Requests" value={summary.total} hint="All-time captures" icon={FaInbox} tone={{ bg: T.blueSoft, border: '#bae6fd', color: T.blue }} />
          <StatCard label="New Today" value={summary.today} hint="Received in last 24h" icon={FaClock} tone={{ bg: '#fffbeb', border: '#fde68a', color: '#b45309' }} />
          <StatCard label="Upcoming Demos" value={summary.upcoming} hint="Scheduled in future" icon={FaCalendarCheck} tone={{ bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }} />
          <StatCard label="Awaiting Call" value={summary.fresh} hint="Not contacted yet" icon={FaUserGroup} tone={{ bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' }} />
        </div>

        {/* ── FILTER BAR ── */}
        <div
          style={{
            background: T.card, border: `1px solid ${T.line}`, borderRadius: 18,
            padding: '12px 14px', marginBottom: 14,
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px', minWidth: 200,
              border: `1px solid ${T.line}`, borderRadius: 11, padding: '0 11px', height: 38, background: '#fff',
            }}
          >
            <FaMagnifyingGlass style={{ width: 12, height: 12, color: T.muted }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, mobile or message…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12.5, color: T.ink, background: 'transparent' }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.muted, display: 'flex' }}
                aria-label="Clear search"
              >
                <FaXmark style={{ width: 11, height: 11 }} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {FILTERS.map((f) => {
              const on = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => { setStatusFilter(f.id); setPage(1); }}
                  style={{
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${on ? T.blue : T.line}`,
                    background: on ? T.blueSoft : '#fff',
                    color: on ? T.blue : T.soft,
                    transition: 'all .18s ease',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <select
            value={rangeFilter}
            onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}
            style={{
              height: 38, borderRadius: 11, border: `1px solid ${T.line}`, background: '#fff',
              fontSize: 12, fontWeight: 600, color: T.soft, padding: '0 10px', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="">All time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="upcoming">Upcoming only</option>
          </select>
        </div>

        {/* ── TABLE ── */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 18, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '56px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <FaSpinner className="animate-spin" style={{ width: 20, height: 20, color: T.blue }} />
              <span style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>Loading demo requests…</span>
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: '58px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 54, height: 54, borderRadius: 18, background: T.blueSoft,
                  border: '1px solid #bae6fd', color: T.blue,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FaInbox style={{ width: 22, height: 22 }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 750, color: T.ink }}>No demo requests found</div>
              <div style={{ fontSize: 12.5, color: T.soft, textAlign: 'center', maxWidth: 380 }}>
                Requests submitted through the landing page “Book Free Demo” form will appear here in real time.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Client', 'Mobile', 'Preferred Schedule', 'Message', 'Status', 'Received', ''].map((h, i) => (
                      <th
                        key={h || `col-${i}`}
                        style={{
                          textAlign: 'left', padding: '11px 14px', fontSize: 10.5,
                          fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                          color: T.muted, borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr
                      key={b._id}
                      onClick={() => openDetail(b)}
                      style={{ cursor: 'pointer', borderBottom: `1px solid ${T.lineSoft}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fbff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #e0f2fe 0%, #fed7aa 130%)',
                              color: '#0369a1', fontWeight: 800, fontSize: 11.5,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: '1px solid #e0f2fe',
                            }}
                          >
                            {initialsOf(b.name)}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap' }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
                              {b.source === 'landing-page' ? 'Landing page' : b.source || 'Landing page'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <a
                          href={`tel:+91${b.mobile}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12.5, fontWeight: 650, color: T.blue, textDecoration: 'none' }}
                        >
                          +91 {b.mobile}
                        </a>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12.5, fontWeight: 650, color: T.ink }}>{fmtDateTime(b.scheduledAt)}</div>
                        <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{fmtRelative(b.scheduledAt)}</div>
                      </td>

                      <td style={{ padding: '12px 14px', maxWidth: 260 }}>
                        <div
                          style={{
                            fontSize: 12, color: T.soft, lineHeight: 1.5,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          title={b.message}
                        >
                          {b.message}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
                          <StatusPill status={b.status} />
                          <select
                            value={b.status}
                            onChange={(e) => changeStatus(b, e.target.value)}
                            aria-label={`Status for ${b.name}`}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer',
                              border: 'none',
                              fontFamily: 'inherit',
                            }}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>{STATUS_META[s].label}</option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.soft }}>{fmtRelative(b.createdAt)}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`tel:+91${b.mobile}`}
                            title="Call"
                            style={{
                              width: 30, height: 30, borderRadius: 9, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: T.blueSoft, color: T.blue, border: '1px solid #bae6fd',
                            }}
                          >
                            <FaPhone style={{ width: 11, height: 11 }} />
                          </a>
                          <a
                            href={`https://wa.me/91${b.mobile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            style={{
                              width: 30, height: 30, borderRadius: 9, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                            }}
                          >
                            <FaWhatsapp style={{ width: 12, height: 12 }} />
                          </a>
                          <button
                            onClick={() => removeBooking(b)}
                            title="Delete"
                            style={{
                              width: 30, height: 30, borderRadius: 9, display: 'flex',
                              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca',
                            }}
                          >
                            <FaTrash style={{ width: 10, height: 10 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && bookings.length > 0 && (
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '11px 14px', borderTop: `1px solid ${T.line}`, background: '#fcfdff',
              }}
            >
              <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 600 }}>
                Page {pagination.page} of {pagination.pages} · {pagination.total} request{pagination.total === 1 ? '' : 's'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                    borderRadius: 9, border: `1px solid ${T.line}`, background: '#fff',
                    fontSize: 11.5, fontWeight: 700, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    color: pagination.page <= 1 ? T.muted : T.soft, opacity: pagination.page <= 1 ? 0.6 : 1,
                  }}
                >
                  <FaChevronLeft style={{ width: 9, height: 9 }} /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                    borderRadius: 9, border: `1px solid ${T.line}`, background: '#fff',
                    fontSize: 11.5, fontWeight: 700,
                    cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                    color: pagination.page >= pagination.pages ? T.muted : T.soft,
                    opacity: pagination.page >= pagination.pages ? 0.6 : 1,
                  }}
                >
                  Next <FaChevronRight style={{ width: 9, height: 9 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL DRAWER ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'flex-end',
            }}
          >
            <motion.div
              initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 440, height: '100%', background: '#fff',
                borderLeft: `1px solid ${T.line}`, display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              <div style={{ padding: '18px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{active.name}</div>
                  <div style={{ fontSize: 12, color: T.soft, marginTop: 2 }}>+91 {active.mobile}</div>
                </div>
                <button
                  onClick={() => setActive(null)}
                  aria-label="Close"
                  style={{ border: 'none', background: '#f8fafc', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', color: T.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaXmark style={{ width: 12, height: 12 }} />
                </button>
              </div>

              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 7 }}>
                    Status
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {STATUS_ORDER.map((s) => {
                      const on = active.status === s;
                      const meta = STATUS_META[s];
                      return (
                        <button
                          key={s}
                          onClick={() => changeStatus(active, s)}
                          style={{
                            padding: '6px 11px', borderRadius: 999, cursor: 'pointer',
                            fontSize: 11.5, fontWeight: 700,
                            border: `1px solid ${on ? meta.color : T.line}`,
                            background: on ? meta.bg : '#fff',
                            color: on ? meta.color : T.soft,
                          }}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>
                      Preferred Slot
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{fmtDateTime(active.scheduledAt)}</div>
                  </div>
                  <div style={{ background: '#f8fafc', border: `1px solid ${T.line}`, borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>
                      Received
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{fmtDateTime(active.createdAt)}</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 7 }}>
                    Message
                  </div>
                  <div style={{ padding: '11px 13px', borderRadius: 12, background: '#f8fafc', border: `1px solid ${T.line}`, fontSize: 12.5, lineHeight: 1.65, color: T.soft, whiteSpace: 'pre-wrap' }}>
                    {active.message}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.muted, marginBottom: 7 }}>
                    <FaNoteSticky style={{ width: 10, height: 10 }} /> Internal Notes
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={4}
                    placeholder="Log your call outcome, follow-up date, or qualification notes…"
                    style={{
                      width: '100%', boxSizing: 'border-box', borderRadius: 12,
                      border: `1px solid ${T.line}`, padding: '11px 13px',
                      fontSize: 12.5, lineHeight: 1.6, color: T.ink, outline: 'none',
                      fontFamily: 'inherit', resize: 'vertical',
                    }}
                  />
                  <button
                    onClick={saveNotes}
                    disabled={saving}
                    style={{
                      marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#fff', fontSize: 12.5, fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1,
                    }}
                  >
                    <FaCircleCheck style={{ width: 11, height: 11 }} />
                    {saving ? 'Saving…' : 'Save Notes'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <a
                    href={`tel:+91${active.mobile}`}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '11px 14px', borderRadius: 11, textDecoration: 'none',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff',
                      fontSize: 12.5, fontWeight: 700,
                    }}
                  >
                    <FaPhone style={{ width: 11, height: 11 }} /> Call Client
                  </a>
                  <a
                    href={`https://wa.me/91${active.mobile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '11px 14px', borderRadius: 11, textDecoration: 'none',
                      background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                      fontSize: 12.5, fontWeight: 700,
                    }}
                  >
                    <FaWhatsapp style={{ width: 13, height: 13 }} /> WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            style={{
              position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
              zIndex: 80, padding: '10px 16px', borderRadius: 11,
              background: toast.type === 'error' ? '#b91c1c' : '#0f172a',
              color: '#fff', fontSize: 12.5, fontWeight: 650,
              boxShadow: '0 14px 34px rgba(15, 23, 42, 0.28)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
