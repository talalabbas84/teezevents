"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  CheckSquare,
  DollarSign,
  Building2,
  AlertTriangle,
  MessageSquare,
  LayoutTemplate,
  FileUp,
} from "lucide-react"

import { type NotificationSummary } from "@/lib/notifications"
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "@/actions/notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function NotificationIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0"
  switch (type) {
    case "TASK_ASSIGNED":
    case "TASK_OVERDUE":
    case "TASK_DUE_SOON":
    case "TASK_COMPLETED":
      return <CheckSquare className={cls} />
    case "BUDGET_ALERT":
      return <DollarSign className={cls} />
    case "VENDOR_STATUS_CHANGED":
      return <Building2 className={cls} />
    case "RISK_ESCALATED":
      return <AlertTriangle className={cls} />
    case "COMMENT_MENTION":
      return <MessageSquare className={cls} />
    case "BLUEPRINT_APPLIED":
      return <LayoutTemplate className={cls} />
    case "FILE_UPLOADED":
      return <FileUp className={cls} />
    default:
      return <Bell className={cls} />
  }
}

type Filter = "all" | "unread" | "read"

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  initialNotifications: NotificationSummary[]
  unreadCount: number
}

export function NotificationsClient({ initialNotifications, unreadCount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>("all")

  const sorted = [...initialNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const filtered = sorted.filter((n) => {
    if (filter === "unread") return !n.isRead
    if (filter === "read") return n.isRead
    return true
  })

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      router.refresh()
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNotification(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <span className="font-serif text-xl font-bold">Notifications</span>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount} unread</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAllRead}
            className="border-primary text-primary hover:bg-primary/10"
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-background p-1 w-fit">
        {(["all", "unread", "read"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <Card className="border border-border shadow-md">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-serif text-xl font-bold text-muted-foreground">No notifications</p>
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? "You're all caught up." : "Nothing here yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={`border shadow-sm transition-colors ${
                !n.isRead
                  ? "border-l-4 border-l-primary bg-primary/5 border-border"
                  : "border-border bg-background"
              }`}
            >
              <CardContent className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div
                  className={`mt-0.5 rounded-full p-2 ${
                    !n.isRead ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <NotificationIcon type={n.type} />
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    {n.actorEmail && (
                      <span className="text-xs text-muted-foreground">· {n.actorEmail}</span>
                    )}
                    {n.link && (
                      <a
                        href={n.link}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      disabled={isPending}
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(n.id)}
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
