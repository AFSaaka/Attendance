import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // This tells the PWA which files to keep for offline use
      includeAssets: ["udslogo.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "UDS TTFPP Portal",
        short_name: "TTFPP",
        description: "UDS Third Trimester Field Practical Program Portal",
        theme_color: "#0c0481",
        icons: [
          {
            src: "udslogo.ico", // Ensure this exists in your public folder
            sizes: "64x64",
            type: "image/x-icon",
          },
          // You should ideally add 192x192 and 512x512 .png icons here for full mobile support
        ],
      },
      workbox: {
        // Caches all your JS, CSS, and HTML files automatically
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
