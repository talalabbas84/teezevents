import { NextResponse } from "next/server"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { processScheduledMarketingPosts } from "@/lib/marketing"

export const runtime = "nodejs"

function hasCronSecret(request: Request) {
  const secret = process.env.MARKETING_CRON_SECRET

  if (!secret) {
    return false
  }

  return request.headers.get("authorization") === `Bearer ${secret}`
}

export async function POST(request: Request) {
  const authenticated = (await isAdminAuthenticated().catch(() => false)) || hasCronSecret(request)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const result = await processScheduledMarketingPosts()

  return NextResponse.json({
    ok: true,
    ...result,
  })
}
