/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#090D16', // Deep Obsidian Charcoal
          card: '#131A26',    // Sleek Slate Card
          border: '#202B3D',  // Subtle Steel Border
          hover: '#2E3D56',   // Interactive Slate Hover
        },
        accent: {
          teal: '#10B981',    // Sophisticated Emerald Green (Growth/Action)
          emerald: '#059669', // Success Green
          purple: '#F59E0B',  // Premium Amber Gold (Highlights/VIP)
          violet: '#D97706',  // Deep Bronze Amber
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glow-teal': '0 0 15px rgba(16, 185, 129, 0.25)',
        'glow-purple': '0 0 15px rgba(245, 158, 11, 0.25)',
      }
    },
  },
  plugins: [],
}
