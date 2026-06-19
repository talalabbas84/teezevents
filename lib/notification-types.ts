export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "TASK_COMPLETED",
  "CHECKLIST_ITEM_DONE",
  "COMMENT_MENTION",
  "BUDGET_ALERT",
  "VENDOR_STATUS_CHANGED",
  "RISK_ESCALATED",
  "BLUEPRINT_APPLIED",
  "FILE_UPLOADED",
  "EVENT_STATUS_CHANGED",
  "AUTOMATION_TRIGGERED",
  "REMINDER",
  "GENERAL",
] as const

export type NotifType = (typeof NOTIFICATION_TYPES)[number]

export type NotificationPreferences = {
  push: Record<NotifType, boolean>
  email: Record<NotifType, boolean>
}

export function defaultPreferences(): NotificationPreferences {
  const push = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])) as Record<NotifType, boolean>
  const email = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, false])) as Record<NotifType, boolean>
  return { push, email }
}
