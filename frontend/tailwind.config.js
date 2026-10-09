/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Modern Crimson Archipelago" — generated from the Stitch design system.
        primary: {
          DEFAULT: '#900c3f', // merah hati
          dark: '#69002b',
          light: '#ae2954',
          container: '#ffd9df',
          onContainer: '#3f0017',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#e2583e', // warm coral
          dark: '#ad321c',
          container: '#ffdad3',
          foreground: '#ffffff',
        },
        tertiary: {
          DEFAULT: '#f39c12', // golden sunset (ratings, badges)
          dark: '#b8770a',
          container: '#ffddb9',
        },
        ink: '#1e293b',
        canvas: '#f8f9fa',
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f9f9ff',
          container: '#e7eeff',
          border: '#e2e8f0',
          faint: '#f1f5f9',
        },
        muted: '#64748b',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(144, 12, 63, 0.05), 0 1px 4px -1px rgba(30, 41, 59, 0.04)',
        float: '0 12px 24px -6px rgba(144, 12, 63, 0.08), 0 4px 12px -2px rgba(30, 41, 59, 0.05)',
        modal: '0 24px 48px -12px rgba(30, 41, 59, 0.18)',
      },
      maxWidth: {
        container: '1240px',
      },
      fontSize: {
        'display-hero': ['48px', { lineHeight: '56px', letterSpacing: '-0.03em', fontWeight: '800' }],
        'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'price': ['20px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
