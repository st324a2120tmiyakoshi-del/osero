/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        board: '#0a0a0c',
        primary: '#e11d48',
        secondary: '#3b82f6',
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      fontFamily: {
        'chuunibyou': ['"Noto Serif JP"', '"Shippori Mincho"', 'serif'],
      }
    },
  },
  plugins: [],
}
