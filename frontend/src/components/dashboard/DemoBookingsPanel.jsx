import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarCheck, FaPhone, FaWhatsapp, FaArrowUpRightFromSquare,
  FaInbox, FaClock, FaChevronRight,
} from 'react-icons/fa6';
import { demoBookingsAPI } from '../../services/api';

const T = {
  card: '#ffffff',
  ink: '#0f172a',
  soft: '#475569',
  muted: '#94a3b8',
  line: '#e2e8f0',
  lineSoft: '#f1f5f9',
  blue: '#0284c7',
  blueSoft: 'rgba(2, 132, 199, 0.10)',
};

const STATUS_META = {
  new: { label: 'New', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  contacted: { label: 'Contacted', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
  scheduled: { label: 'Scheduled', color: '#0e7490', bg: '#ecfeff', border: '#a5f3fc' },
  completed: { label: 'Completed', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  cancelled: { label: 'Cancelled', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

const fmtSlot = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'NA';

/**
 * DemoBookingsPanel
 * Compact live panel rendered on the admin dashboard so freshly booked
 * client demos are visible the moment the admin panel opens.
 */
export default function DemoBookingsPanel() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await demoBookingsAPI.getAll({ page: 1, limit: 6 });
      const body = res?.data || {};
      setBookings(Array.isArray(body.bookings) ? body.bookings : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    demoBookingsAPI.getStats()
      .then((res) => setStats(res?.data?.stats || null))
      .catch(() => setStats(null));
  }, []);

  const pending = stats?.byStatus?.new ?? bookings.filter((b) => b.status === 'new').length;
  const upcoming = stats?.upcoming ?? bookings.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 24,
        padding: '18px 20px 16px',
        boxShadow: '0 3px 18px -6px rgba(0, 0, 0, 0.06)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #0284c7 0%, #f97316 135%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(2, 132, 199, 0.26)',
            }}
          >
            <FaCalendarCheck style={{ width: 16, height: 16 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: '-0.01em' }}>
                Client Demos Booked
              </h3>
              {pending > 0 && (
                <span
                  style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                    background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309',
                  }}
                >
                  {pending} to call
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 500, marginTop: 1 }}>
              {stats?.total != null ? `${stats.total} total requests` : 'Landing page demo requests'} · {upcoming} upcoming
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/demo-bookings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 10, border: `1px solid ${T.line}`, background: '#fff',
            color: T.blue, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
          }}
        >
          View all
          <FaArrowUpRightFromSquare style={{ width: 10, height: 10 }} />
        </motion.button>
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 12, color: T.muted, fontWeight: 600 }}>
          Loading demo requests…
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ padding: '26px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 46, height: 46, borderRadius: 15, background: T.blueSoft,
              border: '1px solid #bae6fd', color: T.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FaInbox style={{ width: 18, height: 18 }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>No demo requests yet</div>
          <div style={{ fontSize: 11.5, color: T.soft, textAlign: 'center', maxWidth: 330 }}>
            Bookings submitted from the landing page “Book Free Demo” form appear here instantly.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bookings.map((b) => {
            const meta = STATUS_META[b.status] || STATUS_META.new;
            return (
              <div
                key={b._id}
                onClick={() => navigate('/demo-bookings')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 6px', borderTop: `1px solid ${T.lineSoft}`, cursor: 'pointer',
                  borderRadius: 10,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fbff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #fed7aa 130%)',
                    color: '#0369a1', fontWeight: 800, fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #e0f2fe',
                  }}
                >
                  {initialsOf(b.name)}
                </span>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.muted, fontWeight: 500 }}>
                    <FaClock style={{ width: 9, height: 9 }} />
                    {fmtSlot(b.scheduledAt)}
                  </div>
                </div>

                <span
                  style={{
                    padding: '2.5px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                    background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {meta.label}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`tel:+91${b.mobile}`}
                    title={`Call +91 ${b.mobile}`}
                    style={{
                      width: 27, height: 27, borderRadius: 8, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: T.blueSoft, color: T.blue, border: '1px solid #bae6fd',
                    }}
                  >
                    <FaPhone style={{ width: 10, height: 10 }} />
                  </a>
                  <a
                    href={`https://wa.me/91${b.mobile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`WhatsApp +91 ${b.mobile}`}
                    style={{
                      width: 27, height: 27, borderRadius: 8, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                    }}
                  >
                    <FaWhatsapp style={{ width: 11, height: 11 }} />
                  </a>
                </div>

                <FaChevronRight style={{ width: 9, height: 9, color: '#cbd5e1', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
