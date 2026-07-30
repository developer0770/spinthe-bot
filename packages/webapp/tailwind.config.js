/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Основная палитра (тёмная тема как базовая)
        bg: {
          900: '#0a0f1a',
          800: '#111827',
          700: '#1a2332',
          600: '#223042',
        },
        surface: {
          glass: 'rgba(255,255,255,0.08)',
          glassStrong: 'rgba(255,255,255,0.14)',
          glassBorder: 'rgba(255,255,255,0.18)',
        },
        wood: {
          DEFAULT: '#8b5a2b',
          dark: '#5a3a1c',
          light: '#b07a45',
          grain: '#6b4423',
        },
        lime: {
          DEFAULT: '#94c92e',
          dark: '#7aa825',
          light: '#b4e050',
        },
        danger: '#ef4444',
        accent: {
          orange: '#ff9800',
          pink: '#ec4899',
          blue: '#3b82f6',
          purple: '#a855f7',
          gold: '#fbbf24',
        },
        heart: '#ef4444',
        diamond: '#06b6d4',
        vip: '#facc15',
        rating: { bg: '#81d4fa', me: '#fff9c4' },
        shop: { pink: '#f48fb1' },
        splash: '#7da049',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        glow: '0 0 20px rgba(148,201,46,0.5)',
        'glow-pink': '0 0 20px rgba(236,72,153,0.5)',
        'glow-orange': '0 0 20px rgba(255,152,0,0.5)',
        'neon': '0 0 10px currentColor, 0 0 20px currentColor',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-bottle': 'bottle-spin 2.5s cubic-bezier(0.2,0.8,0.2,1) forwards',
        'pulse-cta': 'pulse-cta 1.2s ease-in-out infinite',
        'bounce-arrow': 'bounce-arrow 1.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.2,0.8,0.2,1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.2,0.8,0.2,1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.2,0.8,0.2,1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'heart-beat': 'heart-beat 1.4s ease-in-out infinite',
        'coin-pop': 'coin-pop 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        'bottle-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(var(--spin-end, 720deg))' },
        },
        'pulse-cta': {
          '0%,100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(148,201,46,0.7)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 14px rgba(148,201,46,0)' },
        },
        'bounce-arrow': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(30px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'heart-beat': {
          '0%,100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.1)' },
        },
        'coin-pop': {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: 0 },
          '50%': { transform: 'scale(1.3) rotate(10deg)', opacity: 1 },
          '100%': { transform: 'scale(1) rotate(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
