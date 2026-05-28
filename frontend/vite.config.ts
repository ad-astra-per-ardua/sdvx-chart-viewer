import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api":     "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor":    ["react", "react-dom"],
          "router-vendor":   ["react-router-dom"],
          "virtual-vendor":  ["@tanstack/react-virtual"],
          "analytics-vendor": ["@vercel/analytics/react", "@vercel/speed-insights/react"],
        },
      },
    },
  },
});
