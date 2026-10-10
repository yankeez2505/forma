import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider"
import { router } from "@/app/router"

/** after a deploy the open page may still point at old chunk hashes: reload once instead of a broken screen */
window.addEventListener("vite:preloadError", (e) => {
  const key = "forma:reloaded-for"
  if (sessionStorage.getItem(key) === location.href) return
  sessionStorage.setItem(key, location.href)
  e.preventDefault()
  location.reload()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
)
