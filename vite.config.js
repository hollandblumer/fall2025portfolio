import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/fall2025portfolio/", // ← IMPORTANT for GitHub Pages
});
