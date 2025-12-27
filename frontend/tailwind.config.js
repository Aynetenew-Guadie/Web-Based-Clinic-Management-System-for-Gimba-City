/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        fadeInUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeInLeft: { '0%': { opacity: 0, transform: 'translateX(-20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        fadeInRight: { '0%': { opacity: 0, transform: 'translateX(20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        fadeInDown: { '0%': { opacity: 0, transform: 'translateY(-20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        floatSlow: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        pulseSlow: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' } },
        'gradient-x': { '0%, 100%': { 'background-position': '0% 50%' }, '50%': { 'background-position': '100% 50%' } },
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-out forwards',
        fadeInUp: 'fadeInUp 0.8s ease-out forwards',
        fadeInLeft: 'fadeInLeft 0.8s ease-out forwards',
        fadeInRight: 'fadeInRight 0.8s ease-out forwards',
        fadeInDown: 'fadeInDown 0.8s ease-out forwards',
        float: 'float 3s ease-in-out infinite',
        floatSlow: 'floatSlow 5s ease-in-out infinite',
        pulseSlow: 'pulseSlow 2s ease-in-out infinite',
        'gradient-x': 'gradient-x 10s ease infinite',
      },
    },
  },
  plugins: [],
}
