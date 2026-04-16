/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vault: {
          bg:       '#0f1117',
          surface:  '#1a1d27',
          surface2: '#222536',
          border:   'rgba(255,255,255,0.08)',
          green:    '#10d97e',
          amber:    '#f4a134',
          blue:     '#4d9fff',
          red:      '#ff5a5a',
          purple:   '#9d7dff',
          muted:    '#8b8fa8',
          text:     '#e8eaf0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
