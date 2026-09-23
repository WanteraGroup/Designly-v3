/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vilagos alapon dolgozik a felulet: krem hatter, sotet szoveg.
        // A `canvas` a lap hattere, a `panel` a kartyake — a kettot egyutt kell
        // allitani, kulonben a kartyak eltunnek a hatterben.
        canvas: '#f7f5f1',
        panel: '#ffffff',
        'panel-hi': '#f1eee8',
        line: 'rgba(23,23,28,0.10)',
        ink: {
          100: '#17171c',
          200: '#33333d',
          300: '#5b5b68',
          400: '#8a8a97',
        },
        accent: {
          DEFAULT: '#6d4aff',
          strong: '#5a37f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'accent-glow':
          'radial-gradient(circle at 50% 0%, rgba(109,74,255,0.10) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};
