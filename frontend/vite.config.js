import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // This tells the PWA which files to keep for offline use
      includeAssets: [
        "udslogo.ico",
        "apple-touch-icon.png",
        "logo192.png",
        "logo512.png",
      ],
      manifest: {
        name: "UDS TTFPP Portal",
        short_name: "TTFPP",
        description: "UDS Third Trimester Field Practical Program Portal",
        theme_color: "#0c0481",
        icons: [
          {
            src: "udslogo.ico",
            sizes: "64x64",
            type: "image/x-icon",
          },
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Caches all your JS, CSS, and HTML files automatically
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost/uds-api",
        changeOrigin: true,
        secure: true,
        // This removes '/api' from the URL before sending it to Render.
        // Example: localhost:5173/api/login.php -> attendance-et67.../login.php
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
