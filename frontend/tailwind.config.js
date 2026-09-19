/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],

  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      tablet: '640px',
      laptop: '1024px',
      lg: '1024px',
      xl: '1280px',
      desktop: '1440px',
      '2xl': '1440px',
    },

    extend: {
      colors: {
        /* ─────────────────────────────────────────────
           NEW: Dashboard warm palette (matches reference)
           ───────────────────────────────────────────── */
        cream: {
          DEFAULT: '#f4f1ec',
          soft:    '#f8f6f2',
          deep:    '#ece8e1',
          line:    '#e8e4dc',
        },

        ink: {
          DEFAULT: '#1a1a1a',
          soft:    '#6b6b6b',
          muted:   '#9a9a9a',
        },

        /* Orange accent (primary dashboard color) */
        orange: {
          DEFAULT: '#ff5a1f',
          light:   '#ff7a3c',
          dark:    '#e84a10',
          bg:      '#fff0e8',
          soft:    '#ffe4d5',
        },

        /* Status colors */
        success: {
          DEFAULT: '#10b981',
          bg:      '#e7f7f0',
          dark:    '#0d6537',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg:      '#fef3d8',
          dark:    '#b45309',
        },
        danger: {
          DEFAULT: '#ef4444',
          bg:      '#ffe4e6',
          dark:    '#9f1239',
        },
        info: {
          DEFAULT: '#0284c7',
          bg:      '#e0f2fe',
          dark:    '#0369a1',
        },

        /* ─────────────────────────────────────────────
           PRESERVED: Original brand colors
           ───────────────────────────────────────────── */
        evergreen: {
          DEFAULT: '#152614',
          100: '#040704',
          200: '#080f08',
          300: '#0c160c',
          400: '#101d0f',
          500: '#152614',
          600: '#356033',
          700: '#569c52',
          800: '#8bc088',
          900: '#c5e0c4',
        },
        dark_spruce: {
          DEFAULT: '#1e441e',
          100: '#060d06',
          200: '#0c1b0c',
          300: '#122812',
          400: '#183618',
          500: '#1e441e',
          600: '#377d37',
          700: '#53b353',
          800: '#8ccd8c',
          900: '#c6e6c6',
        },
        green: {
          DEFAULT: '#2a7221',
          100: '#091707',
          200: '#112e0d',
          300: '#1a4514',
          400: '#225c1b',
          500: '#2a7221',
          600: '#40ab32',
          700: '#65ce57',
          800: '#98de8f',
          900: '#ccefc7',
        },
        forest_green: {
          DEFAULT: '#119822',
          100: '#031e07',
          200: '#073d0e',
          300: '#0a5b15',
          400: '#0d791c',
          500: '#119822',
          600: '#18d531',
          700: '#46ea5c',
          800: '#84f193',
          900: '#c1f8c9',
        },
        lime_green: {
          DEFAULT: '#31cb00',
          100: '#0a2900',
          200: '#135200',
          300: '#1d7a00',
          400: '#26a300',
          500: '#31cb00',
          600: '#43ff0a',
          700: '#72ff47',
          800: '#a1ff85',
          900: '#d0ffc2',
        },
        primary: {
          50:  '#f0ecff',
          100: '#e0d8ff',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#5b3fc7',
          600: '#4a2eb8',
          700: '#3b22a0',
        },
      },

      /* ─────────────────────────────────────────────
         Extended spacing for dashboard cards
         ───────────────────────────────────────────── */
      spacing: {
        4.5: '1.125rem',
        5.5: '1.375rem',
        6.5: '1.625rem',
        8.5: '2.125rem',
      },

      /* ─────────────────────────────────────────────
         Border radius tokens
         ───────────────────────────────────────────── */
      borderRadius: {
        '4xl': '32px',
      },

      /* ─────────────────────────────────────────────
         Custom shadows
         ───────────────────────────────────────────── */
      boxShadow: {
        'soft':    '0 6px 20px rgba(20,15,10,.05)',
        'card':    '0 6px 20px rgba(20,15,10,.05)',
        'lift':    '0 20px 50px rgba(20,15,10,.08)',
        'orange':  '0 8px 20px rgba(255,90,31,.28)',
        'orange-lg':'0 12px 28px rgba(255,90,31,.4)',
        'subtle':  '0 1px 2px rgba(20,15,10,.04)',
      },

      /* ─────────────────────────────────────────────
         Font families
         ───────────────────────────────────────────── */
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"SF Mono"', 'ui-monospace', 'monospace'],
        serif:   ['"Playfair Display"', 'serif'],
        script:  ['Caveat', 'cursive'],
      },

      /* ─────────────────────────────────────────────
         Custom animations
         ───────────────────────────────────────────── */
      keyframes: {
        barGrow: {
          from: { transform: 'scaleY(0)', opacity: '0' },
          to:   { transform: 'scaleY(1)', opacity: '.9' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '.4', transform: 'scale(.7)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'bar-grow':  'barGrow .8s cubic-bezier(.2,.9,.3,1) backwards',
        'bob':       'bob 5s ease-in-out infinite',
        'fade-up':   'fadeUp .4s ease-out',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
        'shimmer':   'shimmer 2s linear infinite',
      },
    },
  },

  plugins: [],
};