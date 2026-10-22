/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tiktok: {
          pink: '#FE2C55',
          cyan: '#25F4EE',
          dark: '#0B0C10',
          card: '#14161D',
          border: '#252836'
        }
      }
    },
  },
  plugins: [],
}
