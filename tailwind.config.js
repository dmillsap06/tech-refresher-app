/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: 'media', // Updated from 'false' to 'media'
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#303340',
        },
      },
    },
  },
  plugins: [],
}