import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0a12',
          800: '#12121f',
          700: '#1b1b2e',
          600: '#26263f',
        },
        brand: {
          400: '#8b7cff',
          500: '#6c5cff',
          600: '#5847e0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(108, 92, 255, 0.45)',
      },
    },
  },
  plugins: [],
} satisfies Config;
