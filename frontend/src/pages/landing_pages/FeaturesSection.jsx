import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  ArrowRight,
  PhoneCall,
  MessageSquare,
  Users,
  CheckCircle2,
  BarChart3,
  Layers,
  Target,
  ShieldCheck,
  FileSpreadsheet,
  GitMerge,
  MapPin,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { ShinyText } from '../../components/ui/ShinyText';

const FEATURES = [
  {
    id: 1,
    tag: 'Realtime · Pipeline',
    title: 'Smart UI Lead Pipeline',
    subtext: 'Pipeline Hub',
    category: 'Lead Management',
    categoryKey: 'lead',
    icon: Users,
    bg: '#FAF5FF',
    accent: '#7c3aed',
    activeDot: 0,
  },
  {
    id: 2,
    tag: 'Cloud · VoIP',
    title: '1-Click VoIP Dialer & Rec',
    subtext: 'Auto CallIQ',
    category: 'Cloud Telephony',
    categoryKey: 'telephony',
    icon: PhoneCall,
    bg: '#FFFBEB',
    accent: '#d97706',
    activeDot: 1,
  },
  {
    id: 3,
    tag: 'Automated · Reminders',
    title: 'Tasks & Scheduled Calls',
    subtext: 'Scheduler Pro',
    category: 'Cloud Telephony',
    categoryKey: 'telephony',
    icon: CheckCircle2,
    bg: '#F0FDF4',
    accent: '#16a34a',
    activeDot: 0,
  },
  {
    id: 4,
    tag: 'Meta API · Official',
    title: 'WhatsApp Cloud Automated',
    subtext: 'Instant Chats',
    category: 'Messaging & Channels',
    categoryKey: 'messaging',
    icon: MessageSquare,
    bg: '#ECFDF5',
    accent: '#059669',
    activeDot: 2,
  },
  {
    id: 5,
    tag: 'Live Rank · Gamified',
    title: 'Sales Team Leaderboard',
    subtext: 'Live Targets',
    category: 'Enterprise & Tracking',
    categoryKey: 'enterprise',
    icon: BarChart3,
    bg: '#FFF1F2',
    accent: '#e11d48',
    activeDot: 1,
  },
  {
    id: 6,
    tag: '8+ Portals · Instant',
    title: 'Omnichannel API Connect',
    subtext: 'Native Ingest',
    category: 'Messaging & Channels',
    categoryKey: 'messaging',
    icon: Layers,
    bg: '#F0F9FF',
    accent: '#0284c7',
    activeDot: 0,
  },
  {
    id: 7,
    tag: 'High ROI · Automated',
    title: 'End-to-End Ad Campaigns',
    subtext: 'Campaign Flow',
    category: 'Messaging & Channels',
    categoryKey: 'messaging',
    icon: Target,
    bg: '#FEFCE8',
    accent: '#ca8a04',
    activeDot: 3,
  },
  {
    id: 8,
    tag: 'Security · RBAC',
    title: 'Role-Based Access Guard',
    subtext: 'Permissions',
    category: 'Enterprise & Tracking',
    categoryKey: 'enterprise',
    icon: ShieldCheck,
    bg: '#EEF2FF',
    accent: '#4f46e5',
    activeDot: 0,
  },
  {
    id: 9,
    tag: 'Data Hygiene · 10k/sec',
    title: 'Bulk Excel Clean & Import',
    subtext: 'Fast CSV Upload',
    category: 'Lead Management',
    categoryKey: 'lead',
    icon: FileSpreadsheet,
    bg: '#FFF7ED',
    accent: '#ea580c',
    activeDot: 2,
  },
  {
    id: 10,
    tag: 'Round Robin · Fast',
    title: 'Instant Lead Distribution',
    subtext: 'Auto Routing',
    category: 'Lead Management',
    categoryKey: 'lead',
    icon: GitMerge,
    bg: '#ECFEFF',
    accent: '#0891b2',
    activeDot: 1,
  },
  {
    id: 11,
    tag: 'GPS Live · Geo-Radar',
    title: 'Live Employee Geo-Radar',
    subtext: 'Field Attendance',
    category: 'Enterprise & Tracking',
    categoryKey: 'enterprise',
    icon: MapPin,
    bg: '#FAF5FF',
    accent: '#9333ea',
    activeDot: 0,
  },
  {
    id: 12,
    tag: 'Audit Trail · Compliant',
    title: 'Director Portal & Logs',
    subtext: 'Managing Director',
    category: 'Enterprise & Tracking',
    categoryKey: 'enterprise',
    icon: Activity,
    bg: '#F8FAFC',
    accent: '#334155',
    activeDot: 3,
  },
];

const FEATURE_TABS = [
  { id: 'all', label: 'All Capabilities', count: 12 },
  { id: 'lead', label: 'Lead Management', count: 3 },
  { id: 'telephony', label: 'Cloud Telephony', count: 2 },
  { id: 'messaging', label: 'Messaging & Channels', count: 3 },
  { id: 'enterprise', label: 'Enterprise & Tracking', count: 4 },
];

export const FeaturesSection = () => {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showAllCards, setShowAllCards] = useState(false);

  const toggleBookmark = (id, e) => {
    e.stopPropagation();
    setBookmarked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Progressive Disclosure: Default 8 cards (2 rows of 4) in 'all' view, full list in specific category or on expand
  const displayedFeatures = useMemo(() => {
    if (activeTab !== 'all') {
      return FEATURES.filter((f) => f.categoryKey === activeTab);
    }
    if (!showAllCards) {
      return FEATURES.slice(0, 8);
    }
    return FEATURES;
  }, [activeTab, showAllCards]);

  return (
    <section
      id="features"
      className="lp-features-section"
      style={{
        padding: '100px 24px 110px',
        maxWidth: 1320,
        margin: '0 auto',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ══════════════════════════════════════════════
          SECTION HEADER
          ══════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', marginBottom: 42 }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 9999,
            background: 'rgba(4, 102, 200, 0.08)',
            border: '1px solid rgba(4, 102, 200, 0.22)',
            marginBottom: 16,
            boxShadow: '0 2px 10px rgba(4, 102, 200, 0.08)',
          }}
        >
          <Sparkles size={14} color="#0466c8" />
          <ShinyText
            text="ENTERPRISE WORKFLOWS"
            speed={3.5}
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#0466c8',
            }}
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(30px, 4.2vw, 46px)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: '#0f172a',
            margin: '0 0 14px 0',
            fontFamily: '"Bricolage Grotesque", "Plus Jakarta Sans", "Inter", sans-serif',
          }}
        >
          Everything your sales team needs
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            color: '#64748b',
            fontSize: 'clamp(15px, 1.1vw, 17px)',
            maxWidth: 660,
            margin: '0 auto',
            lineHeight: 1.65,
            fontWeight: 450,
          }}
        >
          Built for telecom sales, automated call routing, WhatsApp workflows, and enterprise field tracking in one unified suite.
        </motion.p>
      </div>

      {/* ══════════════════════════════════════════════
          CATEGORY FILTER TABS (COGNITIVE LOAD REDUCER)
          ══════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 38,
        }}
      >
        {FEATURE_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowAllCards(false);
              }}
              style={{
                minHeight: 42,
                padding: '9px 18px',
                borderRadius: 9999,
                border: isSelected
                  ? '1.5px solid #0466c8'
                  : '1px solid rgba(226, 232, 240, 0.95)',
                background: isSelected ? '#0466c8' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                fontSize: 13,
                fontWeight: isSelected ? 750 : 550,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isSelected
                  ? '0 6px 18px rgba(4, 102, 200, 0.25)'
                  : '0 2px 6px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════
          BALANCED 3-COLUMN FEATURE CARDS GRID
          ══════════════════════════════════════════════ */}
      <div className="features-card-grid">
        <AnimatePresence mode="popLayout">
          {displayedFeatures.map((f, index) => {
            const Icon = f.icon;
            const isSaved = !!bookmarked[f.id];
            const isHovered = hoveredCard === f.id;

            return (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: (index % 4) * 0.05 }}
                onMouseEnter={() => setHoveredCard(f.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{ height: '100%' }}
              >
                <SpotlightCard
                  spotlightColor="rgba(255, 255, 255, 0.85)"
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#ffffff',
                    borderRadius: 24,
                    border: isHovered
                      ? `1.5px solid ${f.accent}`
                      : '1px solid rgba(226, 232, 240, 0.9)',
                    boxShadow: isHovered
                      ? `0 20px 40px rgba(0, 0, 0, 0.08), 0 0 20px ${f.accent}20`
                      : '0 4px 20px rgba(0, 0, 0, 0.03)',
                    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                    transition:
                      'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View ${f.title} feature`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate('/login');
                    }
                  }}
                  onClick={() => navigate('/login')}
                >
                  {/* ── UPPER TINTED BODY ────────────────── */}
                  <div
                    style={{
                      background: f.bg,
                      padding: '24px 22px 18px',
                      borderRadius: '20px 20px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 195,
                      position: 'relative',
                    }}
                  >
                    {/* Top Bar: Tag + Large Touch-Target Bookmark Button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          color: '#0f172a',
                          background: 'rgba(255, 255, 255, 0.75)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {f.tag}
                      </span>

                      {/* Generous 40x40px touch target for bookmark */}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(f.id, e)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: isSaved ? `${f.accent}15` : 'rgba(255, 255, 255, 0.85)',
                          border: `1px solid ${isSaved ? f.accent : 'rgba(15, 23, 42, 0.08)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isSaved ? f.accent : '#0f172a',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                        }}
                        aria-label={isSaved ? `Remove bookmark for ${f.title}` : `Bookmark ${f.title}`}
                        title={isSaved ? 'Bookmarked' : 'Save Feature'}
                      >
                        <Bookmark
                          size={18}
                          fill={isSaved ? f.accent : 'none'}
                          strokeWidth={isSaved ? 0 : 2.2}
                        />
                      </button>
                    </div>

                    {/* Middle Title + Tactile Arrow Button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 14,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 'clamp(18px, 1.35vw, 21px)',
                          fontWeight: 750,
                          lineHeight: 1.3,
                          letterSpacing: '-0.02em',
                          color: '#0f172a',
                          margin: 0,
                          fontFamily: '"Inter", sans-serif',
                        }}
                      >
                        {f.title}
                      </h3>

                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.85)',
                          border: '1px solid rgba(15, 23, 42, 0.06)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0f172a',
                          flexShrink: 0,
                          transform: isHovered ? 'translateX(3px)' : 'translateX(0)',
                          transition: 'transform 0.25s ease',
                        }}
                      >
                        <ArrowRight size={17} strokeWidth={2.4} />
                      </span>
                    </div>

                    {/* Indicator Dots */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        marginTop: 22,
                      }}
                    >
                      {[0, 1, 2, 3].map((dotIndex) => (
                        <span
                          key={dotIndex}
                          style={{
                            width: dotIndex === f.activeDot ? 7 : 5,
                            height: dotIndex === f.activeDot ? 7 : 5,
                            borderRadius: '50%',
                            background:
                              dotIndex === f.activeDot
                                ? '#0f172a'
                                : 'rgba(15, 23, 42, 0.22)',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* ── LOWER WHITE FOOTER STRIP ─────────── */}
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderTop: '1px solid rgba(226, 232, 240, 0.75)',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Brand Icon Badge */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: `${f.accent}14`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: f.accent,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={20} strokeWidth={2.2} />
                      </div>

                      {/* Subtext info */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 750,
                            color: '#0f172a',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.25,
                          }}
                        >
                          {f.subtext}
                        </span>
                        <span
                          style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            marginTop: 2,
                          }}
                        >
                          {f.category}
                        </span>
                      </div>
                    </div>

                    {/* Sized "Explore" Action Button with 40px min-height */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/login');
                      }}
                      style={{
                        minHeight: 40,
                        background: isHovered ? f.accent : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 9999,
                        padding: '9px 20px',
                        fontSize: 12.5,
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: isHovered
                          ? `0 4px 14px ${f.accent}45`
                          : '0 2px 6px rgba(15, 23, 42, 0.2)',
                        transition: 'background 0.25s ease, box-shadow 0.25s ease',
                        flexShrink: 0,
                        outline: 'none',
                      }}
                    >
                      <span>Explore</span>
                      <ArrowRight size={13} strokeWidth={2.4} />
                    </button>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════════
          PROGRESSIVE DISCLOSURE TOGGLE (FOR 'ALL' VIEW)
          ══════════════════════════════════════════════ */}
      {activeTab === 'all' && (
        <div style={{ textAlign: 'center', marginTop: 42 }}>
          <button
            type="button"
            onClick={() => setShowAllCards((prev) => !prev)}
            style={{
              minHeight: 46,
              padding: '12px 28px',
              borderRadius: 9999,
              background: '#ffffff',
              border: '1.5px solid #0466c8',
              color: '#0466c8',
              fontSize: 13.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(4, 102, 200, 0.12)',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0466c8';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#0466c8';
            }}
          >
            {showAllCards ? (
              <>
                <span>Show Top 8 Highlights</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                <span>Show All 12 Capabilities</span>
                <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CSS GRID STYLING (RESPONSIVE 4-COLUMN ARCHITECTURE)
          ══════════════════════════════════════════════ */}
      <style>{`
        .features-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          width: 100%;
        }

        @media (max-width: 1240px) {
          .features-card-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
          }
        }

        @media (max-width: 900px) {
          .features-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 580px) {
          .features-card-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </section>
  );
};

export default FeaturesSection;
