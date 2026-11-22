export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#0b0b1a' },
      fontFamily: { display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'], body: ['Inter', 'system-ui', 'sans-serif'] },
      keyframes: {
        pop: { '0%': { transform: 'scale(.85)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        glow: { '0%,100%': { boxShadow: '0 0 0 0 var(--glow)' }, '50%': { boxShadow: '0 0 32px 4px var(--glow)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: { pop: 'pop .25s ease-out', slideUp: 'slideUp .25s ease-out', glow: 'glow 1.8s ease-in-out infinite', float: 'float 3s ease-in-out infinite' },
    },
  },
};
