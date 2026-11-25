import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(process.cwd(), "spa-build"),
  base: "./",
  publicDir: path.resolve(process.cwd(), "public"),
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "android/app/src/main/assets/dist"),
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
    viteReact(),
  ],
});

