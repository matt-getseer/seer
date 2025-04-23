/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontFeatureSettings: {
        sans: '"cv11"',
      },
      colors: {
        primary: {
          50: '#F6F2FF',
          100: '#EDE5FF',
          200: '#D9CBFE',
          300: '#BFA4FC',
          400: '#A57CF8',
          500: '#8349F0',
          600: '#6E35DB',
          700: '#5A25C4',
          800: '#481BA3',
          900: '#351482',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        green: {
          100: '#DCFCE7',
          500: '#22C55E',
        },
        orange: {
          100: '#FFEDD5',
          500: '#F97316',
        },
        red: {
          100: '#FEE2E2',
          500: '#EF4444',
        }
      },
      spacing: {
        '4.5': '1.125rem',
        'sidebar': '280px',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      },
      borderRadius: {
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
} 