/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        panel: {
          DEFAULT: 'rgba(8, 12, 24, 0.78)',
          soft: '#151e39',
          modal: 'rgba(11, 16, 32, 0.96)',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          deep: '#7c3aed',
          orange: '#f97316',
          yellow: '#fbbf24',
          green: '#22c55e',
          red: '#ef4444',
          cyan: '#4cc9f0',
          gold: '#ffb703',
        },
        muted: '#cbd5e1',
        subtle: '#94a3b8',
      },
      fontSize: {
        caption: ['1.05rem', { lineHeight: '1.45' }],
        ui: ['1.15rem', { lineHeight: '1.45' }],
        body: ['1.125rem', { lineHeight: '1.45' }],
        subtitle: ['1.3rem', { lineHeight: '1.35' }],
        title: ['1.45rem', { lineHeight: '1.1' }],
        display: ['clamp(1.45rem, 3.2vw, 2rem)', { lineHeight: '1.1' }],
      },
      spacing: {
        nav: 'calc(92px + env(safe-area-inset-bottom, 0px))',
        sidebar: '280px',
        tap: '48px',
      },
      minHeight: {
        tap: '48px',
      },
      borderRadius: {
        panel: '28px',
        card: '22px',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 16px 60px rgba(0,0,0,0.35)',
        'glow-purple': '0 8px 24px rgba(139, 92, 246, 0.35)',
        panel: '0 24px 70px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(139, 92, 246, 0.04)',
      },
      screens: {
        xs: '480px',
        tablet: '768px',
        lg: '1025px',
        xl: '1200px',
      },
      animation: {
        'modal-backdrop-in': 'modal-backdrop-in 0.22s ease',
        'modal-card-in': 'modal-card-in 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'intro-fade-in': 'intro-fade-in 0.5s ease',
        'intro-title-in': 'intro-title-in 0.55s ease 0.12s both',
        'app-shell-enter': 'app-shell-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'answer-reveal-pop': 'answer-reveal-pop 0.4s ease',
        'option-correct-pop': 'option-correct-pop 0.45s ease',
        'timer-danger-blink': 'timer-danger-blink 0.75s ease-in-out infinite',
      },
      keyframes: {
        'modal-backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-card-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'intro-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'intro-title-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'app-shell-enter': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'answer-reveal-pop': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'option-correct-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'timer-danger-blink': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.35))', opacity: '1' },
          '50%': { filter: 'drop-shadow(0 0 22px rgba(239, 68, 68, 0.95))', opacity: '0.82' },
        },
      },
    },
  },
  plugins: [],
};
