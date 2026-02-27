module.exports = {
  plugins: {
    tailwindcss: {},
    // autoprefixer removed — it triggers browserslist network checks that
    // time out on restricted networks (CN). Tailwind v3 JIT generates
    // modern CSS that doesn't need vendor prefixes for Chrome/Firefox/Safari/Edge.
  },
};
