import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { sendTicketsForEvent } from "@/lib/ticket-delivery"

export const runtime = "nodejs"

const bulkEmailSchema = z.object({
  skipIfAlreadySent: z.boolean().default(true),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const json = await request.json().catch(() => ({}))
  const parsed = bulkEmailSchema.safeParse(json || {})

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bulk email request." }, { status: 400 })
  }

  try {
    const result = await sendTicketsForEvent({
      eventId,
      skipIfAlreadySent: parsed.data.skipIfAlreadySent,
    })

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send event ticket emails."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
