"use server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) {
      return { success: false, error: "Unauthorized" }
    }

    const prisma = getPrismaClient()

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/admin/notifications")

    return { success: true }
  } catch (error) {
    console.error("[markNotificationRead]", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to mark notification as read",
    }
  }
}

/**
 * Marks all unread notifications as read in a single updateMany.
 */
export async function markAllNotificationsRead(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) {
      return { success: false, error: "Unauthorized" }
    }

    const prisma = getPrismaClient()

    await prisma.notification.updateMany({
      where: { isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    revalidatePath("/admin/notifications")

    return { success: true }
  } catch (error) {
    console.error("[markAllNotificationsRead]", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to mark all notifications as read",
    }
  }
}

/**
 * Deletes a single notification record.
 */
export async function deleteNotification(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const authed = await isAdminAuthenticated()
    if (!authed) {
      return { success: false, error: "Unauthorized" }
    }

    const prisma = getPrismaClient()

    await prisma.notification.delete({
      where: { id: notificationId },
    })

    revalidatePath("/admin/notifications")

    return { success: true }
  } catch (error) {
    console.error("[deleteNotification]", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete notification",
    }
  }
}
