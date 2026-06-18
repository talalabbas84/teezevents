"use server"

import { z } from "zod"
import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTOMATION_TRIGGERS = [
  "EVENT_CREATED",
  "EVENT_STATUS_CHANGED",
  "BLUEPRINT_APPLIED",
  "TASK_OVERDUE",
  "TASK_COMPLETED",
  "VENDOR_NOT_CONFIRMED",
  "BUDGET_LIMIT_EXCEEDED",
  "EVENT_DAYS_BEFORE",
  "CHECKLIST_COMPLETED",
  "EVENT_COMPLETED",
] as const

const AUTOMATION_ACTIONS = [
  "CREATE_TASK",
  "SEND_NOTIFICATION",
  "SEND_EMAIL",
  "UPDATE_STATUS",
  "CREATE_CHECKLIST",
  "ADD_COMMENT",
] as const

// ─── Schemas ─────────────────────────────────────────────────────────────────

const RuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  trigger: z.enum(AUTOMATION_TRIGGERS),
  triggerValue: z.string().max(200).optional(),
  action: z.enum(AUTOMATION_ACTIONS),
  actionPayload: z.string().optional(), // JSON string, will be parsed
  eventId: z.string().optional(),
  daysBeforeEvent: z.coerce.number().int().min(1).max(365).optional(),
  isActive: z.boolean().default(true),
})

type RuleInput = z.infer<typeof RuleSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseActionPayload(raw: string | undefined): unknown {
  if (!raw || raw.trim() === "") return null
  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createAutomationRule(
  data: RuleInput,
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) return { success: false, error: "Unauthorized" }

    const parsed = RuleSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" }
    }

    const { actionPayload, ...rest } = parsed.data
    const prisma = getPrismaClient()

    const rule = await prisma.automationRule.create({
      data: {
        ...rest,
        actionPayload: parseActionPayload(actionPayload) as never,
      },
    })

    revalidatePath("/admin/automations")
    return { success: true, data: rule }
  } catch (error) {
    console.error("[createAutomationRule]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create automation rule",
    }
  }
}

export async function updateAutomationRule(
  id: string,
  data: Partial<RuleInput>,
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) return { success: false, error: "Unauthorized" }

    if (!id) return { success: false, error: "Rule ID is required" }

    const parsed = RuleSchema.partial().safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Validation failed" }
    }

    const { actionPayload, ...rest } = parsed.data
    const prisma = getPrismaClient()

    const updateData: Record<string, unknown> = { ...rest }
    if (actionPayload !== undefined) {
      updateData.actionPayload = parseActionPayload(actionPayload) as never
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/admin/automations")
    return { success: true, data: rule }
  } catch (error) {
    console.error("[updateAutomationRule]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update automation rule",
    }
  }
}

export async function deleteAutomationRule(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) return { success: false, error: "Unauthorized" }

    if (!id) return { success: false, error: "Rule ID is required" }

    const prisma = getPrismaClient()

    await prisma.automationRule.delete({ where: { id } })

    revalidatePath("/admin/automations")
    return { success: true }
  } catch (error) {
    console.error("[deleteAutomationRule]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete automation rule",
    }
  }
}

export async function toggleAutomationRule(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) return { success: false, error: "Unauthorized" }

    if (!id) return { success: false, error: "Rule ID is required" }

    const prisma = getPrismaClient()

    const rule = await prisma.automationRule.update({
      where: { id },
      data: { isActive },
    })

    revalidatePath("/admin/automations")
    return { success: true, data: rule }
  } catch (error) {
    console.error("[toggleAutomationRule]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle automation rule",
    }
  }
}
