/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'binance-yellow': '#F0B90B',
        'binance-dark': '#0B0E11',
        'binance-gray': '#1E2329',
        'binance-gray-light': '#2B3139',
        'binance-gray-border': '#474D57',
        'binance-text': '#EAECEF',
        'binance-text-secondary': '#848E9C',
        'binance-green': '#0ECB81',
        'binance-red': '#F6465D',
      },
    },
  },
  plugins: [],
}

