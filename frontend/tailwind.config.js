/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#000000', // Pure Stark Black
          600: '#0f172a',
          700: '#1e293b',
          900: '#020617',
        },
        slate: {
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 8px 32px rgba(0, 0, 0, 0.08)',
        glass: '0 4px 30px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
