import { useEffect } from "react"

/** keeps the screen on while mounted; silently does nothing where unsupported */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null
      } catch {
        lock = null
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void request()
    }
    void request()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      void lock?.release().catch(() => undefined)
    }
  }, [])
}
