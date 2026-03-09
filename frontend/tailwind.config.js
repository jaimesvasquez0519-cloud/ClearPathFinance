/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb'
        },
        success: '#22c55e',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
