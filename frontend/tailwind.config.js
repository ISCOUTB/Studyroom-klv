/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'utb-blue': {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#7fb2ff',
          400: '#4a8dff',
          500: '#0B4FC4',
          600: '#093fa3',
          700: '#072f7d',
          800: '#062660',
          900: '#041c43',
        },
      },
    },
  },
  plugins: [],
};