"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

export function AdminRealtimeListener() {
  const router = useRouter()
  const pathname = usePathname()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pathname.startsWith("/admin") || pathname === "/admin/login" || pathname === "/admin/accept-invite") {
      return
    }

    const source = new EventSource("/api/admin/realtime")

    source.addEventListener("update", () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        router.refresh()
      }, 250)
    })

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      source.close()
    }
  }, [pathname, router])

  return null
}
