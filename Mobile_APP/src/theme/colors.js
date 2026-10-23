// src/theme/colors.js

export const lightColors = {
  background: '#F4F7FB',
  foreground: '#1F2937',

  card: '#FFFFFF',
  cardForeground: '#1F2937',

  // Primary Enterprise Palette
  primary: '#174EA6', // Primary Blue
  primaryForeground: '#FFFFFF',
  navy: '#12305A',    // Deep Navy
  accent: '#F28C28',  // Accent Orange

  // Secondary & Neutral Surfaces
  secondary: '#F4F7FB',
  secondaryForeground: '#174EA6',

  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',

  // System & Semantic Palette
  blue: '#174EA6',
  green: '#059669',
  red: '#DC2626',
  orange: '#F28C28',
  yellow: '#D97706',
  pink: '#DB2777',
  purple: '#7C3AED',
  teal: '#0D9488',
  indigo: '#4F46E5',

  // Custom semantic
  border: '#E2E8F0',
  muted: '#94A3B8',
  success: '#059669',
};

export const darkColors = {
  background: '#0B1220',
  foreground: '#F1F5F9',

  card: '#111A2B',
  cardForeground: '#F1F5F9',

  primary: '#38BDF8',
  primaryForeground: '#0B1220',
  navy: '#12305A',
  accent: '#F28C28',

  secondary: '#1E293B',
  secondaryForeground: '#E2E8F0',

  destructive: '#FF453A',
  destructiveForeground: '#FFFFFF',

  blue: '#38BDF8',
  green: '#30D158',
  red: '#FF453A',
  orange: '#F28C28',
  yellow: '#FFD60A',
  pink: '#FF375F',
  purple: '#BF5AF2',
  teal: '#64D2FF',
  indigo: '#5E5CE6',

  border: '#1E293B',
  muted: '#64748B',
  success: '#30D158',
};

// Legacy compatibility export for existing app screens and components
export const colors = {
  ...lightColors,
  primaryDark: '#12305A',
  primaryLight: '#E8F0FE',
  primaryGlow: 'rgba(23, 78, 166, 0.15)',
  orangeDark: '#C26510',
  orangeLight: '#FFF7ED',
  orangeGlow: 'rgba(242, 140, 40, 0.22)',
  surface: '#FFFFFF',
  surfaceLight: '#F4F7FB',
  cardBorder: '#E2E8F0',
  text: '#1F2937',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  fresh: '#174EA6',
  contacted: '#F28C28',
  interested: '#7C3AED',
  won: '#059669',
  lost: '#DC2626',
  urgent: '#E11D48',
  borderHighlight: '#CBD5E1',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#174EA6',
  whatsapp: '#25D366',
  whatsappDark: '#128C7E',
};

export const typography = {
  titleLarge: 26,
  title: 20,
  subtitle: 16,
  body: 14,
  caption: 12,
  micro: 10,
};

