import { copyFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig, type Plugin } from "vitest/config"

// GitHub Pages serves 404.html for unknown paths → SPA fallback
const spaFallback = (): Plugin => ({
  name: "spa-404",
  apply: "build",
  closeBundle() {
    copyFileSync("dist/index.html", "dist/404.html")
  },
})

const pwa = VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["icon.svg", "apple-touch-icon.png"],
  manifest: {
    name: "Forma",
    short_name: "Forma",
    description: "Персональные тренировки и питание",
    lang: "ru",
    start_url: "/forma/",
    scope: "/forma/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  },
  workbox: {
    navigateFallback: "/forma/index.html",
    globPatterns: ["**/*.{js,css,html,svg,png,woff2,json}"],
    runtimeCaching: [
      { urlPattern: /\.supabase\.co\//, handler: "NetworkOnly" },
      {
        urlPattern: /\/forma\/exercises\/.*\.webp$/,
        handler: "CacheFirst",
        options: {
          cacheName: "exercise-images",
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
        },
      },
    ],
  },
})

export default defineConfig({
  base: "/forma/",
  plugins: [react(), tailwindcss(), spaFallback(), pwa],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
})
