/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mistral: {
          orange: '#FF7000',
          amber: '#FFB800',
          'orange-light': '#FF9E44',
          dark: '#0F172A',
          card: '#1E293B',
          'card-hover': '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
