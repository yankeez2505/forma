import { copyFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vitest/config"

// GitHub Pages serves 404.html for unknown paths → SPA fallback
const spaFallback = (): Plugin => ({
  name: "spa-404",
  apply: "build",
  closeBundle() {
    copyFileSync("dist/index.html", "dist/404.html")
  },
})

export default defineConfig({
  base: "/forma/",
  plugins: [react(), tailwindcss(), spaFallback()],
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
