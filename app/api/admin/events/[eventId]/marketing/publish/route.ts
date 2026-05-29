import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { publishMarketingPost, sendMarketingEmailCampaign } from "@/lib/marketing"

export const runtime = "nodejs"

const marketingPublishSchema = z.object({
  platform: z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK", "X", "LINKEDIN", "WHATSAPP", "EMAIL"]),
  campaignName: z.string().trim().min(1).max(120),
  utmCampaign: z.string().trim().min(1).max(120),
  caption: z.string().trim().min(1).max(5000),
  targetUrl: z.string().trim().min(1).max(1000),
  mediaUrls: z.array(z.string().trim().max(1000)).max(10).optional(),
  objective: z.string().trim().max(160).optional(),
  audience: z.string().trim().max(240).optional(),
  budgetCents: z.number().int().min(0).max(100000000).optional(),
  scheduledAt: z.string().trim().max(40).optional(),
  emailSubject: z.string().trim().max(160).optional(),
  testRecipient: z.string().trim().email().max(190).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const json = await request.json().catch(() => null)
  const parsed = marketingPublishSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid marketing publish request." }, { status: 400 })
  }

  try {
    if (parsed.data.platform === "EMAIL") {
      const result = await sendMarketingEmailCampaign({
        eventId,
        campaignName: parsed.data.campaignName,
        utmCampaign: parsed.data.utmCampaign,
        subject: parsed.data.emailSubject || parsed.data.campaignName,
        body: parsed.data.caption,
        targetUrl: parsed.data.targetUrl,
        testRecipient: parsed.data.testRecipient,
      })

      return NextResponse.json({
        ok: true,
        mode: "email",
        ...result,
      })
    }

    const result = await publishMarketingPost({
      eventId,
      platform: parsed.data.platform,
      campaignName: parsed.data.campaignName,
      utmCampaign: parsed.data.utmCampaign,
      caption: parsed.data.caption,
      targetUrl: parsed.data.targetUrl,
      mediaUrls: parsed.data.mediaUrls,
      objective: parsed.data.objective,
      audience: parsed.data.audience,
      budgetCents: parsed.data.budgetCents,
      scheduledAt: parsed.data.scheduledAt,
    })

    if (result.mode === "failed") {
      return NextResponse.json({ ok: false, ...result }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run marketing action."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
