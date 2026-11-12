/**
 * AOTMS — landing page design tokens.
 *
 * Single source of truth for every colour, gradient, shadow and type scale used
 * by the public landing page. Components must never hard-code a hex value.
 *
 * Colour rules (keep them — this is what makes the page feel "designed"):
 *   ink     → typography and dark surfaces
 *   cobalt  → brand / interactive (primary buttons, links, active states)
 *   amber   → emphasis (promo chips, typing cursor, one highlight per view)
 *   teal    → AI & telephony accents
 *   emerald → success / verified
 *   rose    → error only
 * Decorative rainbows are not allowed — every colour above has a job.
 */

/* ─────────────────────────────────────────────────────────
   Raw ramps
   ───────────────────────────────────────────────────────── */

/** Cool graphite — neutrals. */
export const ink = {
  50: '#F5F7FB',
  100: '#E9EDF5',
  200: '#D5DCE9',
  300: '#B0BAD0',
  400: '#8391AE',
  500: '#5F6E8C',
  600: '#44526E',
  700: '#2E3A54',
  800: '#1B2438',
  900: '#111829',
  950: '#070C18',
};

/** Brand cobalt. */
export const cobalt = {
  50: '#EFF4FF',
  100: '#DBE6FE',
  200: '#BFD2FD',
  300: '#93B4FB',
  400: '#6091F7',
  500: '#2563EB',
  600: '#1D4ED8',
  700: '#1B3FB8',
  800: '#1B3499',
  900: '#1A2E7A',
  950: '#101C47',
};

/** Emphasis amber. */
export const amber = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
};

/** AI / telephony teal. */
export const teal = {
  50: '#ECFEFF',
  100: '#CFFAFE',
  200: '#A5F3FC',
  300: '#67E8F9',
  400: '#22D3EE',
  500: '#06B6D4',
  600: '#0891B2',
  700: '#0E7490',
  800: '#155E75',
};

/** Success emerald. */
export const emerald = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
};

/** Error rose. */
export const rose = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
};

/* ─────────────────────────────────────────────────────────
   Semantic tokens
   ───────────────────────────────────────────────────────── */

export const surface = {
  page: '#FFFFFF',
  subtle: '#F6F8FC',
  sunken: '#EEF2F8',
  inverse: ink[950],
  inverseSoft: ink[900],
};

export const border = {
  hairline: '#EDF1F7',
  base: '#E1E7F1',
  strong: '#C9D2E1',
  onDark: 'rgba(255, 255, 255, 0.14)',
  onDarkSoft: 'rgba(255, 255, 255, 0.08)',
};

export const text = {
  primary: ink[900],
  secondary: ink[600],
  tertiary: ink[500],
  muted: ink[400],
  inverse: '#FFFFFF',
  inverseSoft: 'rgba(255, 255, 255, 0.80)',
  inverseMuted: 'rgba(255, 255, 255, 0.62)',
};

export const brand = {
  base: cobalt[500],
  hover: cobalt[600],
  active: cobalt[700],
  soft: cobalt[50],
  tint: 'rgba(37, 99, 235, 0.08)',
  tintStrong: 'rgba(37, 99, 235, 0.14)',
  line: 'rgba(37, 99, 235, 0.22)',
  ring: 'rgba(37, 99, 235, 0.30)',
  glow: 'rgba(37, 99, 235, 0.42)',
};

export const accent = {
  /** Emphasis — promo chips, highlights. */
  amber: {
    base: amber[500],
    strong: amber[600],
    soft: amber[50],
    tint: 'rgba(245, 158, 11, 0.12)',
    line: 'rgba(245, 158, 11, 0.28)',
    text: amber[700],
  },
  /** AI & telephony. */
  teal: {
    base: teal[500],
    strong: teal[600],
    soft: teal[50],
    tint: 'rgba(6, 182, 212, 0.12)',
    line: 'rgba(6, 182, 212, 0.28)',
    text: teal[700],
  },
  /** Verified / success. */
  emerald: {
    base: emerald[500],
    strong: emerald[600],
    soft: emerald[50],
    tint: 'rgba(16, 185, 129, 0.12)',
    line: 'rgba(16, 185, 129, 0.28)',
    text: emerald[700],
  },
};

/* ─────────────────────────────────────────────────────────
   Gradients
   ───────────────────────────────────────────────────────── */

export const gradients = {
  /** Hero slide 1 — CRM pipeline. */
  heroCrm:
    'linear-gradient(158deg, #050A16 0%, #0A1330 28%, #14275F 58%, #1B3499 82%, #2D5BE3 100%)',
  /** Hero slide 2 — AI telecaller. */
  heroAi:
    'linear-gradient(158deg, #03070D 0%, #061520 30%, #0A3546 62%, #0C5F79 84%, #0891B2 100%)',
  /** Dark conversion banners. */
  night: 'linear-gradient(135deg, #0A1120 0%, #14275F 62%, #1B3499 100%)',
  /** Primary action. */
  brand: 'linear-gradient(135deg, #2563EB 0%, #1B3499 100%)',
  brandHover: 'linear-gradient(135deg, #3B76F0 0%, #1D4ED8 100%)',
  /** Soft brand wash for cards / chips. */
  brandSoft:
    'linear-gradient(180deg, rgba(37, 99, 235, 0.06) 0%, rgba(255, 255, 255, 0) 62%)',
  /** Section fades. */
  fadeUp: 'linear-gradient(180deg, #FFFFFF 0%, #F6F8FC 100%)',
  fadeDown: 'linear-gradient(180deg, #F6F8FC 0%, #FFFFFF 100%)',
};

/* ─────────────────────────────────────────────────────────
   Elevation
   ───────────────────────────────────────────────────────── */

export const shadows = {
  xs: '0 1px 2px rgba(11, 17, 32, 0.05)',
  sm: '0 2px 8px rgba(11, 17, 32, 0.06)',
  md: '0 8px 24px rgba(11, 17, 32, 0.08)',
  lg: '0 18px 44px rgba(11, 17, 32, 0.10)',
  xl: '0 32px 72px rgba(11, 17, 32, 0.16)',
  brand: '0 10px 26px rgba(37, 99, 235, 0.28)',
  brandLg: '0 16px 38px rgba(37, 99, 235, 0.36)',
  glass: '0 24px 60px -24px rgba(3, 8, 20, 0.55)',
};

/* ─────────────────────────────────────────────────────────
   Geometry, type & motion
   ───────────────────────────────────────────────────────── */

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 9999,
};

export const layout = {
  maxWidth: 1200,
  maxWidthWide: 1240,
  gutter: 'clamp(20px, 5vw, 64px)',
  sectionY: 'clamp(64px, 8vw, 112px)',
};

export const fonts = {
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  /**
   * Headings — same family as body. The landing page has always loaded Inter
   * only, so display type falls back to Inter as well (no extra webfont).
   */
  display:
    '"Inter", "Plus Jakarta Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
};

export const transitions = {
  /** Signature easing used across the page. */
  ease: [0.22, 1, 0.36, 1],
  fast: '0.2s ease',
  base: '0.28s ease',
  slow: '0.4s ease',
};

export const theme = {
  ink,
  cobalt,
  amber,
  teal,
  emerald,
  rose,
  surface,
  border,
  text,
  brand,
  accent,
  gradients,
  shadows,
  radii,
  layout,
  fonts,
  transitions,
};

export default theme;
