/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mineral: {
          50: '#faf8f6',
          500: '#8b7355',
          700: '#5c4a3d',
          900: '#2c2416',
        }
      },
    },
  },
  plugins: [],
}
