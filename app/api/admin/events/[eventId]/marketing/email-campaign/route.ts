import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { sendTemplatedMarketingEmailCampaign } from "@/lib/marketing"

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
  recipientSource: z.enum(["EVENT_GUESTS", "PASTED_EMAILS", "BOTH"]).default("EVENT_GUESTS"),
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

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const json = await request.json().catch(() => null)
  const parsed = emailCampaignSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email campaign request." }, { status: 400 })
  }

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email campaign."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
