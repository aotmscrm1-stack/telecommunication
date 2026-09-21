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
           New Color Combo (Sky Blue, Blue Green, Deep Space Blue, Amber Flame, Princeton Orange)
           ───────────────────────────────────────────── */
        'sky_blue_(light)': { DEFAULT: '#8ecae6', 100: '#0d2e3d', 200: '#1b5c7a', 300: '#288ab7', 400: '#51aed9', 500: '#8ecae6', 600: '#a5d5eb', 700: '#bbdff0', 800: '#d2eaf5', 900: '#e8f4fa' },
        sky_blue_light: { DEFAULT: '#8ecae6', 100: '#0d2e3d', 200: '#1b5c7a', 300: '#288ab7', 400: '#51aed9', 500: '#8ecae6', 600: '#a5d5eb', 700: '#bbdff0', 800: '#d2eaf5', 900: '#e8f4fa' },
        sky_blue: { DEFAULT: '#8ecae6', 100: '#0d2e3d', 200: '#1b5c7a', 300: '#288ab7', 400: '#51aed9', 500: '#8ecae6', 600: '#a5d5eb', 700: '#bbdff0', 800: '#d2eaf5', 900: '#e8f4fa' },
        blue_green: { DEFAULT: '#219ebc', 100: '#071f25', 200: '#0d3e4b', 300: '#145d70', 400: '#1a7d95', 500: '#219ebc', 600: '#39bcdc', 700: '#6bcce5', 800: '#9cddee', 900: '#ceeef6' },
        deep_space_blue: { DEFAULT: '#023047', 100: '#00090e', 200: '#01131c', 300: '#011c2a', 400: '#012638', 500: '#023047', 600: '#04699b', 700: '#06a3f1', 800: '#54c3fb', 900: '#a9e1fd' },
        amber_flame: { DEFAULT: '#ffb703', 100: '#342500', 200: '#684b00', 300: '#9c7000', 400: '#d09500', 500: '#ffb703', 600: '#ffc637', 700: '#ffd569', 800: '#ffe39b', 900: '#fff1cd' },
        princeton_orange: { DEFAULT: '#fb8500', 100: '#321b00', 200: '#643500', 300: '#965000', 400: '#c86b00', 500: '#fb8500', 600: '#ff9e2f', 700: '#ffb663', 800: '#ffce97', 900: '#ffe7cb' },

        /* ─────────────────────────────────────────────
           Professional Nordic Teal & Slate Palette
           ───────────────────────────────────────────── */
        ash_grey: { DEFAULT: '#cad2c5', 100: '#282e23', 200: '#4f5c47', 300: '#778a6a', 400: '#a0af97', 500: '#cad2c5', 600: '#d5dcd1', 700: '#dfe4dc', 800: '#eaede8', 900: '#f4f6f3' },
        muted_teal: { DEFAULT: '#84a98c', 100: '#19241b', 200: '#314736', 300: '#4a6b51', 400: '#638e6c', 500: '#84a98c', 600: '#9cbaa3', 700: '#b5ccba', 800: '#ceddd1', 900: '#e6eee8' },
        deep_teal: { DEFAULT: '#52796f', 100: '#111816', 200: '#21312d', 300: '#324943', 400: '#426159', 500: '#52796f', 600: '#6d9c90', 700: '#92b5ac', 800: '#b6cdc8', 900: '#dbe6e3' },
        dark_slate_grey: { DEFAULT: '#354f52', 100: '#0a0f10', 200: '#151f20', 300: '#1f2e30', 400: '#2a3e40', 500: '#354f52', 600: '#527a7e', 700: '#76a1a6', 800: '#a4c0c3', 900: '#d1e0e1' },
        charcoal_blue: { DEFAULT: '#2f3e46', 100: '#090c0e', 200: '#13191c', 300: '#1c252a', 400: '#263238', 500: '#2f3e46', 600: '#4e6876', 700: '#7290a1', 800: '#a1b5c0', 900: '#d0dae0' },

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