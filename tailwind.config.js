/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f3f0ff',
          100: '#ebe4ff',
          200: '#d9ccff',
          300: '#bea6ff',
          400: '#9f75ff',
          500: '#8346ff',
          600: '#7123f7',
          700: '#6113e3',
          800: '#5110be',
          900: '#430e9b',
          950: '#290169',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
