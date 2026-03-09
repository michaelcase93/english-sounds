/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'card-tap': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(0.94)' },
          '100%': { transform: 'scale(1)' },
        },
        'ripple': {
          '0%':   { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '70%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'card-tap':  'card-tap 0.2s ease-in-out',
        'ripple':    'ripple 0.6s ease-out forwards',
        'slide-up':  'slide-up 0.3s ease-out',
        'pop-in':    'pop-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      screens: {
        xs: '375px',
      }
    },
  },
  plugins: [],
}
