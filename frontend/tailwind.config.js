/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4AF37',
          dark: '#111111',
          gray: '#222222',
          light: '#F5F5F5',
        },
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Roboto", "sans-serif"],
        sans: ['Roboto', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-in-out',
        fadeOut: 'fadeOut 0.4s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
