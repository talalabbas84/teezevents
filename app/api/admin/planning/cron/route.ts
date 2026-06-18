import { NextResponse } from "next/server"
import { getPrismaClient } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export const runtime = "nodejs"

export async function GET(request: Request) {
  // ── Auth: verify CRON_SECRET if configured ─────────────────────────────────
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = request.headers.get("Authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const prisma = getPrismaClient()
  let notificationsCreated = 0
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // ── Fetch active events ──────────────────────────────────────────────────
    const activeEvents = await prisma.event.findMany({
      where: {
        planningStatus: {
          notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"],
        },
      },
      select: {
        id: true,
        title: true,
        startsAt: true,
      },
    })

    for (const event of activeEvents) {
      // ── 1. Overdue tasks ───────────────────────────────────────────────────
      const overdueTasks = await prisma.planningTask.findMany({
        where: {
          eventId: event.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: now },
        },
        select: { id: true, title: true },
      })

      for (const task of overdueTasks) {
        await createNotification({
          type: "TASK_OVERDUE",
          title: `Overdue task: ${task.title}`,
          body: `Task "${task.title}" is past its due date for event "${event.title}".`,
          link: `/admin/planning/${event.id}/tasks`,
          eventId: event.id,
          entityType: "PlanningTask",
          entityId: task.id,
        })
        notificationsCreated++
      }

      // ── 2. Tasks due in 24 hours ───────────────────────────────────────────
      const dueSoonTasks = await prisma.planningTask.findMany({
        where: {
          eventId: event.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { gte: now, lte: in24h },
        },
        select: { id: true, title: true },
      })

      for (const task of dueSoonTasks) {
        await createNotification({
          type: "TASK_DUE_SOON",
          title: `Task due soon: ${task.title}`,
          body: `Task "${task.title}" is due within 24 hours for event "${event.title}".`,
          link: `/admin/planning/${event.id}/tasks`,
          eventId: event.id,
          entityType: "PlanningTask",
          entityId: task.id,
        })
        notificationsCreated++
      }

      // ── 3. Events starting in 7 days with unconfirmed vendors ──────────────
      if (
        event.startsAt &&
        event.startsAt >= now &&
        event.startsAt <= in7d
      ) {
        const unconfirmedVendors = await prisma.eventVendor.findMany({
          where: {
            eventId: event.id,
            status: { notIn: ["CONFIRMED", "CANCELLED", "REJECTED"] },
          },
          select: { id: true, name: true },
        })

        if (unconfirmedVendors.length > 0) {
          await createNotification({
            type: "VENDOR_UNCONFIRMED",
            title: `Unconfirmed vendors for "${event.title}"`,
            body: `${unconfirmedVendors.length} vendor(s) not yet confirmed. Event starts in 7 days.`,
            link: `/admin/planning/${event.id}/vendors`,
            eventId: event.id,
            entityType: "Event",
            entityId: event.id,
          })
          notificationsCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      eventsChecked: activeEvents.length,
      ranAt: now.toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[cron] Planning automation error:", message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
