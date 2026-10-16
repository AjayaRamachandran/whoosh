import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "ui"),
  base: "./",
  plugins: [react(), tailwindcss()],
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
