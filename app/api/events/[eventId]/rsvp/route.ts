import { NextResponse } from "next/server"
import { z } from "zod"

import { saveEventRsvp } from "@/lib/checkout"

export const runtime = "nodejs"

const rsvpSchema = z.object({
  status: z.enum(["GOING", "INTERESTED", "CANT_GO"]),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(40).optional(),
  emailOptIn: z.boolean().default(true),
  smsOptIn: z.boolean().default(false),
  source: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const json = await request.json().catch(() => null)
  const parsed = rsvpSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RSVP request." }, { status: 400 })
  }

  try {
    const rsvp = await saveEventRsvp({
      eventId,
      status: parsed.data.status,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      emailOptIn: parsed.data.emailOptIn,
      smsOptIn: parsed.data.smsOptIn,
      source: parsed.data.source,
      notes: parsed.data.notes,
      userAgent: request.headers.get("user-agent") || undefined,
    })

    return NextResponse.json({
      ok: true,
      rsvp: {
        id: rsvp.id,
        status: rsvp.status,
        email: rsvp.email,
        phone: rsvp.phone,
        emailOptIn: rsvp.emailOptIn,
        smsOptIn: rsvp.smsOptIn,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save RSVP."
    const status = /not accepting|not found/i.test(message) ? 404 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
