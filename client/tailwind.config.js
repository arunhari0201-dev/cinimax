
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ["Inter", ...defaultTheme.fontFamily.sans],
    },
    extend: {
      fontFamily: {
        inter: ["Inter", ...defaultTheme.fontFamily.sans],
        poppins: ["Poppins", "Inter", ...defaultTheme.fontFamily.sans],
        playfair: ["Poppins", "Inter", ...defaultTheme.fontFamily.sans],
        cinzel: ["Poppins", "Inter", ...defaultTheme.fontFamily.sans],
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-in forwards',
        fadeInSlow: 'fadeInSlow 2s ease-in forwards',
        fadeInUp: 'fadeInUp 0.5s ease-out forwards',
        scaleUp: 'scaleUp 0.3s ease forwards',
        slideRight: 'slideRight 3s ease infinite',
        fade: 'fade 1.5s ease-in-out',
        bounce: 'bounce 2s infinite',
        loading: 'loading 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        fadeInSlow: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fade: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        loading: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
