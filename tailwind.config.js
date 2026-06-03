/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 16px 60px rgba(0,0,0,0.35)',
      },
      colors: {
        ink: '#0b1020',
        panel: '#10172d',
        panelSoft: '#151e39',
        accent: '#ffb703',
        accent2: '#4cc9f0',
      },
    },
  },
  plugins: [],
};
