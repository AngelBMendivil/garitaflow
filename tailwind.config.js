/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:  '#0A1B3D',
          blue:  '#1E5BFF',
          cyan:  '#00B6FF',
          gray:  '#A6B0C3',
        },
        surface: {
          bg:     '#F8FAFC',
          border: '#E2E8F0',
          muted:  '#64748B',
        },
        wait: {
          fast:     '#16A34A',
          moderate: '#D97706',
          high:     '#EA580C',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}