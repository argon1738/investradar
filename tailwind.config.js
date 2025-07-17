/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#002855',
        'brand-secondary': '#004385',
        'brand-accent': '#00A3E0',
        'positive': '#22c55e',
        'negative': '#ef4444',
      }
    }
  },
  plugins: [],
}
