import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080C14',
        panel: '#101722',
        surface: '#121A25',
        line: 'rgba(255,255,255,0.08)',
        text: '#E7EEF7',
        muted: '#8B98AD',
        teal: '#4FFFD4',
        success: '#35D07F',
        warning: '#E2A93B',
        danger: '#E46363',
      },
      boxShadow: {
        panel: '0 12px 40px rgba(0, 0, 0, 0.35)',
      },
      backdropBlur: {
        terminal: '12px',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

