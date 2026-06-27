/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        aligo: {
          // Exact brand colors extracted from aligo.com.co corporate logo
          50: '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc7c7',
          300: '#ff9999',
          400: '#f86e6e',
          500: '#f14646',
          600: '#e02424', // CTA bright red (buttons, active items)
          700: '#9b1414', // Mid crimson
          800: '#7a0d0d', // Logo background blood red (sidebar primary)
          900: '#5a0909', // Deep shadow red
          950: '#3a0505', // Darkest variant
        },
        slate: {
          // Tinted grays to neutral for absolute black aesthetic
          800: '#18181b', // zinc-900 equivalent
          900: '#09090b', // zinc-950 equivalent
          950: '#000000', // pure black
        }
      }
    },
  },
  plugins: [],
}