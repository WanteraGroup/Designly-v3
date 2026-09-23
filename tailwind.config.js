/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#07070c',
        panel: '#0e0e16',
        'panel-hi': '#15151f',
        line: 'rgba(255,255,255,0.09)',
        ink: {
          100: '#eef0f6',
          200: '#c9cddb',
          300: '#9aa1b4',
          400: '#6b7180',
        },
        accent: {
          DEFAULT: '#7c5cff',
          strong: '#6b48f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'accent-glow':
          'radial-gradient(circle at 50% 0%, rgba(124,92,255,0.22) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};
