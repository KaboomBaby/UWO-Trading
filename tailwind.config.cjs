/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071021",
        panel: "#f7ead3",
        amber: {
          glow: "#f2b74b",
        },
        sea: {
          blue: "#2f80ed",
        },
      },
    },
  },
  plugins: [],
};
