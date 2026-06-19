"use client"

import { useActionState, useEffect, useState } from "react"
import { Bell, CheckSquare, ListChecks, Loader2, Mail, MessageSquare, Save, Settings, Smartphone, Users } from "lucide-react"
import { toast } from "sonner"

import {
  updateNotificationPreferences,
  type NotificationPreferences,
  type NotifType,
  NOTIFICATION_TYPES,
} from "@/actions/notification-preferences"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

type Category = {
  label: string
  icon: React.ElementType
  types: NotifType[]
}

const CATEGORIES: Category[] = [
  {
    label: "Tasks",
    icon: CheckSquare,
    types: ["TASK_ASSIGNED", "TASK_DUE_SOON", "TASK_OVERDUE", "TASK_COMPLETED"],
  },
  {
    label: "Checklists & Comments",
    icon: ListChecks,
    types: ["CHECKLIST_ITEM_DONE", "COMMENT_MENTION"],
  },
  {
    label: "Event & Planning",
    icon: Settings,
    types: ["EVENT_STATUS_CHANGED", "BUDGET_ALERT", "VENDOR_STATUS_CHANGED", "RISK_ESCALATED", "BLUEPRINT_APPLIED", "FILE_UPLOADED", "AUTOMATION_TRIGGERED"],
  },
  {
    label: "General",
    icon: Bell,
    types: ["REMINDER", "GENERAL"],
  },
]

const TYPE_LABELS: Record<NotifType, string> = {
  TASK_ASSIGNED: "Task assigned to you",
  TASK_DUE_SOON: "Task due in 48 hours",
  TASK_OVERDUE: "Task is overdue",
  TASK_COMPLETED: "Task marked complete",
  CHECKLIST_ITEM_DONE: "Checklist item completed",
  COMMENT_MENTION: "Someone mentions you in a comment",
  BUDGET_ALERT: "Budget limit approaching",
  VENDOR_STATUS_CHANGED: "Vendor status updated",
  RISK_ESCALATED: "Risk escalated to Critical",
  BLUEPRINT_APPLIED: "Blueprint applied to event",
  FILE_UPLOADED: "New file uploaded",
  EVENT_STATUS_CHANGED: "Event planning status changed",
  AUTOMATION_TRIGGERED: "Automation rule triggered",
  REMINDER: "Scheduled reminders",
  GENERAL: "General system alerts",
}

const TYPE_DESCRIPTIONS: Partial<Record<NotifType, string>> = {
  TASK_DUE_SOON: "Sent 48h before due date",
  BUDGET_ALERT: "When spend exceeds 80% of budget",
  RISK_ESCALATED: "Only for Critical severity",
  COMMENT_MENTION: "When @your-email appears in a comment",
  AUTOMATION_TRIGGERED: "Each time an automation runs",
}

function initialPrefs(prefs: NotificationPreferences): NotificationPreferences {
  return {
    push: { ...prefs.push },
    email: { ...prefs.email },
  }
}

function ChannelHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${color}`}>
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  )
}

export function NotificationPreferencesClient({
  initialPreferences,
}: {
  initialPreferences: NotificationPreferences
}) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => initialPrefs(initialPreferences))
  const [isDirty, setIsDirty] = useState(false)

  const [state, formAction, isPending] = useActionState(updateNotificationPreferences, null)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success("Notification preferences saved")
      setIsDirty(false)
    } else {
      toast.error(state.error ?? "Failed to save preferences")
    }
  }, [state])

  function toggle(channel: "push" | "email", type: NotifType) {
    setPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [type]: !prev[channel][type] },
    }))
    setIsDirty(true)
  }

  function setAllInCategory(channel: "push" | "email", types: NotifType[], value: boolean) {
    setPrefs((prev) => {
      const updated = { ...prev[channel] }
      types.forEach((t) => { updated[t] = value })
      return { ...prev, [channel]: updated }
    })
    setIsDirty(true)
  }

  function setAllChannel(channel: "push" | "email", value: boolean) {
    setPrefs((prev) => ({
      ...prev,
      [channel]: Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, value])) as Record<NotifType, boolean>,
    }))
    setIsDirty(true)
  }

  const pushEnabledCount = NOTIFICATION_TYPES.filter((t) => prefs.push[t]).length
  const emailEnabledCount = NOTIFICATION_TYPES.filter((t) => prefs.email[t]).length

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Inject JSON into a hidden field before submitting
        const input = e.currentTarget.querySelector<HTMLInputElement>('input[name="preferences"]')
        if (input) input.value = JSON.stringify(prefs)
      }}
    >
      <input type="hidden" name="preferences" defaultValue="" />

      <div className="space-y-6">
        {/* ── Channel summary + master toggles ─────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(["push", "email"] as const).map((channel) => {
            const count = channel === "push" ? pushEnabledCount : emailEnabledCount
            const allOn = count === NOTIFICATION_TYPES.length
            const Icon = channel === "push" ? Smartphone : Mail
            return (
              <div
                key={channel}
                className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${channel === "push" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"}`}>
                    <Icon size={17} />
                  </span>
                  <div>
                    <div className="text-sm font-semibold capitalize">{channel === "push" ? "Push (phone)" : "Email"}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} of {NOTIFICATION_TYPES.length} enabled
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {channel === "email" && count === 0 && (
                    <Badge variant="outline" className="border-muted text-[10px] text-muted-foreground">Off</Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setAllChannel(channel, !allOn)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {allOn ? "Disable all" : "Enable all"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* ── Per-category rows ─────────────────────────────────────── */}
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const pushAllOn = cat.types.every((t) => prefs.push[t])
            const emailAllOn = cat.types.every((t) => prefs.email[t])

            return (
              <div key={cat.label}>
                {/* Category header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <cat.icon size={15} className="text-primary" />
                    <span className="font-serif text-base font-bold">{cat.label}</span>
                    <span className="text-xs text-muted-foreground">({cat.types.length})</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setAllInCategory("push", cat.types, !pushAllOn)}
                      className="hover:text-primary"
                    >
                      Push: {pushAllOn ? "off all" : "on all"}
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setAllInCategory("email", cat.types, !emailAllOn)}
                      className="hover:text-primary"
                    >
                      Email: {emailAllOn ? "off all" : "on all"}
                    </button>
                  </div>
                </div>

                {/* Column headers (only on first category, on wider screens) */}
                <div className="mb-1.5 hidden grid-cols-[1fr_72px_72px] gap-3 px-1 sm:grid">
                  <div />
                  <ChannelHeader icon={Smartphone} label="Push" color="text-primary" />
                  <ChannelHeader icon={Mail} label="Email" color="text-blue-600" />
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  {cat.types.map((type, idx) => (
                    <div
                      key={type}
                      className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_72px_72px] ${
                        idx < cat.types.length - 1 ? "border-b border-border/60" : ""
                      }`}
                    >
                      {/* Label + description */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{TYPE_LABELS[type]}</div>
                        {TYPE_DESCRIPTIONS[type] && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</div>
                        )}
                      </div>

                      {/* Mobile: both toggles inline */}
                      <div className="flex items-center gap-3 sm:contents">
                        <div className="flex flex-col items-center gap-1 sm:justify-center">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-primary sm:hidden">Push</span>
                          <Switch
                            checked={prefs.push[type]}
                            onCheckedChange={() => toggle("push", type)}
                            aria-label={`Push: ${TYPE_LABELS[type]}`}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1 sm:justify-center">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 sm:hidden">Email</span>
                          <Switch
                            checked={prefs.email[type]}
                            onCheckedChange={() => toggle("email", type)}
                            aria-label={`Email: ${TYPE_LABELS[type]}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Save ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending || !isDirty}
            className="gap-2 bg-primary text-primary-foreground hover:bg-accent"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {isPending ? "Saving…" : "Save Preferences"}
          </Button>
          {isDirty && !isPending && (
            <span className="text-xs text-muted-foreground">You have unsaved changes</span>
          )}
          {!isDirty && state?.success && (
            <span className="text-xs text-emerald-600">Saved successfully</span>
          )}
        </div>
      </div>
    </form>
  )
}
