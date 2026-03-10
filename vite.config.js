const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  root: path.resolve(__dirname, "ui"),
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    allowedHosts: true,
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: path.resolve(__dirname, "dist", "ui"),
    emptyOutDir: true
  }
});
