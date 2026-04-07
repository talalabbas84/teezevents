import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { markTicketCheckedIn } from "@/lib/checkout"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketCode: string }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  const { ticketCode } = await params
  const formData = await request.formData().catch(() => null)
  const redirectTo = formData?.get("redirectTo")
  const nextPath =
    typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : `/tickets/code/${ticketCode}`

  await markTicketCheckedIn(ticketCode)

  return NextResponse.redirect(new URL(nextPath, request.url))
}
