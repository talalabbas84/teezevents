"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireAdminSession } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"

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

// Push: all ON by default. Email: all OFF by default.
export function defaultPreferences(): NotificationPreferences {
  const push = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, true])) as Record<NotifType, boolean>
  const email = Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, false])) as Record<NotifType, boolean>
  return { push, email }
}

function mergeWithDefaults(raw: unknown): NotificationPreferences {
  const defaults = defaultPreferences()
  if (!raw || typeof raw !== "object") return defaults
  const obj = raw as Record<string, unknown>

  const merge = (channel: "push" | "email") => {
    const src = (obj[channel] && typeof obj[channel] === "object") ? obj[channel] as Record<string, unknown> : {}
    return Object.fromEntries(
      NOTIFICATION_TYPES.map((t) => [t, t in src ? Boolean(src[t]) : defaults[channel][t]])
    ) as Record<NotifType, boolean>
  }

  return { push: merge("push"), email: merge("email") }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const session = await requireAdminSession()
  const prisma = getPrismaClient()

  const row = await prisma.notificationPreference.findUnique({
    where: { userEmail: session.email },
  })

  if (!row) return defaultPreferences()

  return mergeWithDefaults({ push: row.push, email: row.email })
}

const prefsSchema = z.object({
  push: z.record(z.boolean()),
  email: z.record(z.boolean()),
})

export async function updateNotificationPreferences(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdminSession()
    const prisma = getPrismaClient()

    const raw = formData.get("preferences")
    if (!raw || typeof raw !== "string") {
      return { success: false, error: "Missing preferences data." }
    }

    const parsed = prefsSchema.parse(JSON.parse(raw))

    await prisma.notificationPreference.upsert({
      where: { userEmail: session.email },
      create: {
        userEmail: session.email,
        push: parsed.push,
        email: parsed.email,
      },
      update: {
        push: parsed.push,
        email: parsed.email,
      },
    })

    revalidatePath("/admin/settings")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to save preferences." }
  }
}

export async function shouldSendNotification(
  userEmail: string,
  type: NotifType,
  channel: "push" | "email"
): Promise<boolean> {
  const prisma = getPrismaClient()
  const row = await prisma.notificationPreference.findUnique({
    where: { userEmail },
    select: { push: true, email: true },
  })

  if (!row) {
    return channel === "push" // push on by default, email off by default
  }

  const prefs = mergeWithDefaults({ push: row.push, email: row.email })
  return prefs[channel][type] ?? (channel === "push")
}
