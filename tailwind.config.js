/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          nude: '#fff3f7',
          'nude-dark': '#ccc2c3',
          accent: '#EFE4DE',
          card: '#FFFFFF',
          espresso: '#2C1E1B',
          taupe: '#ccc2c3',
          rose: '#D99B91',
          terracotta: '#B86B60',
          gold: '#D4AF37',
          border: '#ccc2c3',
        }
      },
      fontFamily: {
        brand: ['Borscha', 'serif'],
        hero: ['Borscha', 'serif'],
        editorial: ['Borscha', 'serif'],
        script: ['Respective', 'cursive'],
        sans: ['Borscha', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(44, 30, 27, 0.08)',
        'glass-hover': '0 14px 44px 0 rgba(44, 30, 27, 0.12)',
        'luxury': '0 20px 50px -10px rgba(44, 30, 27, 0.12)',
        'floating': '0 15px 35px rgba(217, 155, 145, 0.25)',
      },
      backdropBlur: {
        'glass': '20px',
        'super': '30px',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'float': 'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 14s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
