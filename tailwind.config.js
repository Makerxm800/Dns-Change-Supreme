/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#dcf3ff',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      keyframes: {
        'tab-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.992)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-pop': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'toast-slide': {
          '0%': { opacity: '0', transform: 'translateX(20px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'icon-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tab-enter': 'tab-enter 0.26s cubic-bezier(0.22, 1, 0.36, 1) both',
        'modal-pop': 'modal-pop 0.24s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'toast-slide': 'toast-slide 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'icon-bob': 'icon-bob 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
