/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orchid: {
          50: '#fbf7fd',
          100: '#f5edfa',
          200: '#eddcf6',
          300: '#debfee',
          400: '#c798e2',
          500: '#ad6fd3',
          600: '#944ec0',
          700: '#7b3ba3',
          800: '#673385',
          900: '#552c6c',
          950: '#38164b',
        },
      },
    },
  },
  plugins: [],
}
