import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { buildCsv } from "@/lib/csv"
import { getAdminRsvpExports } from "@/lib/checkout"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const url = new URL(request.url)
  const eventId = url.searchParams.get("eventId") || undefined
  const rsvps = await getAdminRsvpExports(eventId)
  const csv = buildCsv([
    [
      "event_id",
      "event_title",
      "status",
      "name",
      "email",
      "phone",
      "email_opt_in",
      "sms_opt_in",
      "source",
      "notes",
      "created_at",
      "last_submitted_at",
    ],
    ...rsvps.map((rsvp) => [
      rsvp.eventId,
      rsvp.event.title,
      rsvp.status,
      rsvp.name,
      rsvp.email,
      rsvp.phone,
      rsvp.emailOptIn ? "yes" : "no",
      rsvp.smsOptIn ? "yes" : "no",
      rsvp.source,
      rsvp.notes,
      rsvp.createdAt.toISOString(),
      rsvp.lastSubmittedAt.toISOString(),
    ]),
  ])

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${eventId ? `${eventId}-` : ""}teez-rsvps-export.csv"`,
    },
  })
}
