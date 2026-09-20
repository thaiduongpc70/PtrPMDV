module.exports = {
  content: ['./index.html', './src/**/*.{css,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#172033',
          paper: '#f6faf8',
          teal: '#0f766e',
          orange: '#f97316',
          blue: '#2563eb',
          red: '#be123c'
        }
      },
      borderRadius: {
        app: '8px'
      }
    }
  },
  plugins: []
};
