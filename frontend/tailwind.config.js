/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          500: '#4f6ef7',
          600: '#3a56e8',
          700: '#2d45cc',
          900: '#1a2a7a',
        },
      },
    },
  },
  plugins: [],
}
