/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * A hatterkep miatt a felulet sotet: a canvas majdnem fekete, de nem
         * tiszta #000 — a hero-hatter also harmadaban levo arany para adja a
         * melyseget, es egy teljesen fekete alap elnyelne.
         *
         * A `panel` felig atlatszo, mert a kartyaknak a hatterkep folott kell
         * ulniuk, nem eltakarniuk.
         */
        canvas: '#060607',
        panel: 'rgba(10, 10, 12, 0.72)',
        'panel-hi': 'rgba(22, 22, 26, 0.82)',
        line: 'rgba(201, 164, 92, 0.22)',
        ink: {
          100: '#f2efe8',
          200: '#d6d2c8',
          300: '#a8a396',
          400: '#78746a',
        },
        accent: {
          DEFAULT: '#c9a45c',
          strong: '#b8923f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Marcellus', 'Cormorant Garamond', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'accent-glow':
          'radial-gradient(circle at 50% 0%, rgba(201,164,92,0.18) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};
