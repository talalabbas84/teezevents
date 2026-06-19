"use server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { publishRealtimeEvent } from "@/lib/realtime"
import { revalidatePath } from "next/cache"

function emitPostEventRealtime(eventId: string, action: string, entityId?: string) {
  publishRealtimeEvent({
    type: "planning:update",
    eventId,
    action,
    entityType: "PostEventReview",
    entityId,
  })
}

export async function upsertPostEventReview(
  eventId: string,
  data: {
    actualAttendance?: number
    actualRevenueCents?: number
    teamFeedback?: string
    whatWentWell?: string
    whatWentWrong?: string
    lessonsLearned?: string
    improvementNotes?: string
    overallRating?: number
  }
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const db = getPrismaClient()

    const result = await db.postEventReview.upsert({
      where: { eventId },
      create: {
        ...data,
        eventId,
        createdByEmail: "admin",
      },
      update: {
        ...data,
      },
    })

    revalidatePath(`/admin/planning/${eventId}/post-event`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    emitPostEventRealtime(eventId, "POST_EVENT_REVIEW_UPDATED", result.id)

    return { success: true, data: result }
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An error occurred.",
    }
  }
}

export async function markReviewSavedToBlueprint(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const db = getPrismaClient()

    await db.postEventReview.update({
      where: { eventId },
      data: { savedToBlueprint: true },
    })

    revalidatePath(`/admin/planning/${eventId}/post-event`)
    revalidatePath(`/admin/planning/${eventId}/dashboard`)
    emitPostEventRealtime(eventId, "POST_EVENT_REVIEW_SAVED_TO_BLUEPRINT", eventId)

    return { success: true }
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "An error occurred.",
    }
  }
}
