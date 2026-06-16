import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { publishMarketingPost, sendMarketingEmailCampaign, sendTemplatedMarketingEmailCampaign } from "@/lib/marketing"

export const runtime = "nodejs"

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().max(190).optional(),
)

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  )

const emailCampaignSchema = z.object({
  recipientSource: z.enum(["EVENT_GUESTS", "RSVP_CONTACTS", "PASTED_EMAILS", "BOTH"]).default("EVENT_GUESTS"),
  sourceEventId: optionalText(80),
  pastedEmails: z.string().max(200000).optional(),
  testRecipient: optionalEmail,
  campaignName: z.string().trim().min(1).max(120),
  utmCampaign: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(180),
  bodyTemplate: z.string().trim().min(1).max(12000),
  includeDiscountCodes: z.boolean().default(false),
  codePrefix: optionalText(16),
  discountType: z.enum(["FIXED", "PERCENT"]).default("PERCENT"),
  amountValue: z.coerce.number().min(0).max(10000).optional(),
  expiresAt: optionalText(40),
  baseUrl: optionalText(500),
})

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
  scheduledAt: optionalText(40),
  emailSubject: z.string().trim().max(160).optional(),
  testRecipient: optionalEmail,
})

async function handleMarketingPublish(request: Request, eventId: string) {
  const json = await request.json().catch(() => null)
  const parsed = marketingPublishSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid marketing publish request." }, { status: 400 })
  }

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
}

async function handleEmailCampaign(request: Request, eventId: string) {
  const json = await request.json().catch(() => null)
  const parsed = emailCampaignSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email campaign request." }, { status: 400 })
  }

  const result = await sendTemplatedMarketingEmailCampaign({
    eventId,
    sourceEventId: parsed.data.sourceEventId,
    recipientSource: parsed.data.recipientSource,
    pastedEmails: parsed.data.pastedEmails,
    testRecipient: parsed.data.testRecipient,
    campaignName: parsed.data.campaignName,
    utmCampaign: parsed.data.utmCampaign,
    subject: parsed.data.subject,
    bodyTemplate: parsed.data.bodyTemplate,
    includeDiscountCodes: parsed.data.includeDiscountCodes,
    codePrefix: parsed.data.codePrefix,
    discountType: parsed.data.discountType,
    amountValue: parsed.data.amountValue,
    expiresAt: parsed.data.expiresAt,
    baseUrl: parsed.data.baseUrl || new URL(request.url).origin,
  })

  return NextResponse.json({
    ok: true,
    ...result,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string; adminEventAction: string[] }> },
) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId, adminEventAction } = await params
  const action = adminEventAction.join("/")

  try {
    if (action === "marketing/publish") {
      return await handleMarketingPublish(request, eventId)
    }

    if (action === "marketing/email-campaign") {
      return await handleEmailCampaign(request, eventId)
    }

    return NextResponse.json({ error: "Admin event action not found." }, { status: 404 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run admin event action."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
