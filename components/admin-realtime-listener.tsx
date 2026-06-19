"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

type RealtimePayload = {
  type?: string
  action?: string | null
  recipientEmail?: string | null
  title?: string | null
  body?: string | null
  link?: string | null
}

export function AdminRealtimeListener({ currentEmail }: { currentEmail?: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pathname.startsWith("/admin") || pathname === "/admin/login" || pathname === "/admin/accept-invite") {
      return
    }

    const source = new EventSource("/api/admin/realtime")

    source.addEventListener("update", (message) => {
      let payload: RealtimePayload = {}
      try {
        payload = JSON.parse(message.data || "{}") as RealtimePayload
      } catch {
        payload = {}
      }
      const recipientEmail = payload.recipientEmail?.trim().toLowerCase()
      const normalizedCurrentEmail = currentEmail?.trim().toLowerCase()
      const isForCurrentUser = !recipientEmail || recipientEmail === normalizedCurrentEmail

      if (payload.type === "notification:update" && payload.action === "NOTIFICATION_CREATED" && isForCurrentUser) {
        toast(payload.title || "New notification", {
          description: payload.body ?? undefined,
          action: payload.link
            ? {
                label: "Open",
                onClick: () => router.push(payload.link as string),
              }
            : undefined,
        })
      }

      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        router.refresh()
      }, 250)
    })

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      source.close()
    }
  }, [currentEmail, pathname, router])

  return null
}
