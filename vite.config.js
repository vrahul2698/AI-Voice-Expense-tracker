import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({ include: "**/*.{jsx,js}" }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "VoiceLog — Voice Expense Tracker",
        short_name: "VoiceLog",
        description: "Speak your expenses. They log themselves to Google Sheets.",
        theme_color: "#6c63ff",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "https://placehold.co/192x192/6c63ff/ffffff?text=VL", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "https://placehold.co/512x512/6c63ff/ffffff?text=VL", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: { globPatterns: [] },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  server: {
    host: true,   // ← exposes to your local network
    port: 5173,
    proxy: {
      "/api": "http://192.168.1.6:5000",
      "/auth/google": "http://192.168.1.6:5000",
      "/auth/logout": "http://192.168.1.6:5000",
      "/auth/me": "http://192.168.1.6:5000",
    },
  },
});
