/**
 * AOTMS — landing page design tokens.
 *
 * Single source of truth for the public landing page palette and type stack.
 * Components must never hard-code a hex value: the page root republishes these
 * values as `--hs-*` CSS custom properties (see Landing.jsx) so the
 * High-Contrast toggle can swap every section from one place.
 *
 * Colour jobs (keep them — this is what makes the page feel "designed"):
 *   navy   → headlines, primary type, lead-name weight
 *   muted  → body copy and secondary labels
 *   canvas → alternating section wash
 *   orange → the single action colour (buttons, active states, links)
 *   pink   → AI / assistant accents inside mockups
 *   forest → dark conversion bands and the lead-card surface
 *   craft  → small print details (stickers, labels on dark)
 */

/** Neutral hairlines and washes used by cards, strips and section bands. */
export const hub = {
  navy: '#213343',
  navySoft: '#33475B',
  muted: '#516F90',
  line: '#E3E8EE',
  lineStrong: '#CBD6E2',
  canvas: '#F5F8FA',
  heroTint: '#F4FAFB',
  white: '#FFFFFF',
  orange: '#FF5C35',
  orangeHover: '#FF7A59',
  orangeActive: '#E24B22',
  orangeSoft: '#FFF3EF',
  orangeTint: 'rgba(255, 92, 53, 0.10)',
  orangeLine: '#FFD9CD',
  /** Marker stroke behind the emphasised words of a headline. */
  orangeMark: '#FFDFD4',
  pinkSoft: '#FDEDF3',
  pinkText: '#B4306A',
  forest: '#1E3D36',
  forestSoft: '#2A4E45',
  forestText: '#CFE8DF',
  /** Footer link area — a shade darker than the forest CTA band. */
  forestDeep: '#0E1A17',
  /** Dark conversion bands — mirrors the hero's forest lead card. */
  forestGradient: 'linear-gradient(135deg, #12211D 0%, #1E3D36 58%, #2A4E45 100%)',
  craftYellow: '#FFD84D',
  craftRed: '#F2545B',
};

export const fonts = {
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  /** Editorial serif used by every section headline. */
  serif: '"Source Serif 4", "Iowan Old Style", "Palatino Linotype", Georgia, serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
};

export const theme = { hub, fonts };

export default theme;
