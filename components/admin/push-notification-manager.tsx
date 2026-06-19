"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { sendTestPushNotification } from "@/actions/notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type PushStatus =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "denied"
  | "subscribed"
  | "available"
  | "error"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

async function getServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/")
  if (existing) return existing
  return navigator.serviceWorker.register("/sw.js", { scope: "/" })
}

async function postSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/admin/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Unable to save push subscription.")
  }
}

async function deleteSubscription(subscription: PushSubscription) {
  await fetch("/api/admin/push-subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
}

export function PushNotificationManager({
  publicKey,
  activeSubscriptionCount,
}: {
  publicKey: string
  activeSubscriptionCount: number
}) {
  const [status, setStatus] = useState<PushStatus>("checking")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  }, [])

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!supported) {
        setStatus("unsupported")
        setMessage("This browser does not support web push.")
        return
      }

      if (!publicKey) {
        setStatus("unconfigured")
        setMessage("Web Push VAPID keys are not configured.")
        return
      }

      if (Notification.permission === "denied") {
        setStatus("denied")
        setMessage("Notifications are blocked for this app.")
        return
      }

      try {
        const registration = await getServiceWorkerRegistration()
        const subscription = await registration.pushManager.getSubscription()
        if (!cancelled) {
          setStatus(subscription ? "subscribed" : "available")
          setMessage(subscription ? "Phone push is enabled on this device." : "Phone push is available on this device.")
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error")
          setMessage(error instanceof Error ? error.message : "Unable to check push status.")
        }
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [publicKey, supported])

  function handleEnable() {
    startTransition(async () => {
      try {
        if (!supported) throw new Error("This browser does not support web push.")
        if (!publicKey) throw new Error("Web Push VAPID keys are not configured.")

        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "available")
          setMessage("Notification permission was not granted.")
          return
        }

        const registration = await getServiceWorkerRegistration()
        const existing = await registration.pushManager.getSubscription()
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }))

        await postSubscription(subscription)
        setStatus("subscribed")
        setMessage("Phone push is enabled on this device.")
        toast.success("Phone notifications enabled")
      } catch (error) {
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Unable to enable phone notifications.")
        toast.error(error instanceof Error ? error.message : "Unable to enable phone notifications.")
      }
    })
  }

  function handleDisable() {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/")
        const subscription = await registration?.pushManager.getSubscription()

        if (subscription) {
          await deleteSubscription(subscription)
          await subscription.unsubscribe()
        }

        setStatus("available")
        setMessage("Phone push is disabled on this device.")
        toast.success("Phone notifications disabled")
      } catch (error) {
        setStatus("error")
        setMessage(error instanceof Error ? error.message : "Unable to disable phone notifications.")
      }
    })
  }

  function handleTest() {
    startTransition(async () => {
      const result = await sendTestPushNotification()
      if (result.success) {
        toast.success("Test notification sent")
      } else {
        toast.error(result.error ?? "Unable to send test notification.")
      }
    })
  }

  const badgeLabel =
    status === "subscribed"
      ? "Enabled"
      : status === "denied"
        ? "Blocked"
        : status === "unconfigured"
          ? "Setup needed"
          : status === "unsupported"
            ? "Unsupported"
            : "Available"

  return (
    <Card className="border border-border bg-background/80 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-xl font-bold">Phone Push</h3>
                <Badge variant={status === "subscribed" ? "default" : "outline"}>{badgeLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {message || "Enable push notifications for this device."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeSubscriptionCount} active device{activeSubscriptionCount === 1 ? "" : "s"} for this account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "subscribed" ? (
            <Button type="button" variant="outline" onClick={handleDisable} disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
              Disable
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleEnable}
              disabled={isPending || status === "unsupported" || status === "unconfigured" || status === "denied"}
              className="gap-2 bg-primary text-primary-foreground hover:bg-accent"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Enable
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={isPending || status !== "subscribed"}
          >
            Send Test
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
