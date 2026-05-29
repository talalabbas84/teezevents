import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getMarketingIntegrationStatuses } from "@/lib/marketing"

export const runtime = "nodejs"

export async function GET() {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  return NextResponse.json({
    integrations: getMarketingIntegrationStatuses(),
  })
}
