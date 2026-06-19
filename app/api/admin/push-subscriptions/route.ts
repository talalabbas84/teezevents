import { NextResponse } from "next/server"
import { z } from "zod"

import { getPrismaClient } from "@/lib/prisma"
import { getCurrentTeamContext } from "@/lib/team-access"

export const runtime = "nodejs"

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
})

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentTeamContext()
    const parsed = pushSubscriptionSchema.parse(await request.json())
    const prisma = getPrismaClient()

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: {
        userEmail: currentUser.email,
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      },
      update: {
        userEmail: currentUser.email,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        isActive: true,
        lastSeenAt: new Date(),
        failedAt: null,
        failureReason: null,
      },
    })

    return NextResponse.json({
      success: true,
      id: subscription.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save push subscription."
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentTeamContext()
    const parsed = deleteSubscriptionSchema.parse(await request.json())
    const prisma = getPrismaClient()

    await prisma.pushSubscription.updateMany({
      where: {
        endpoint: parsed.endpoint,
        userEmail: currentUser.email,
      },
      data: {
        isActive: false,
        failedAt: null,
        failureReason: "User disabled push notifications.",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove push subscription."
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
