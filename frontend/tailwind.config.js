/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        isp: {
          navy: '#24334A',
          navyDark: '#1B2638',
          teal: '#00AFAA',
          tealLight: '#66CFCC',
          tealTint: '#E0F5F5',
        },
      },
      fontFamily: {
        sans: ['Mont', 'Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
