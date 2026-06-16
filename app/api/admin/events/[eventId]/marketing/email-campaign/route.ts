import { NextResponse } from "next/server"
import { z } from "zod"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import {
  getEventEmailCampaignHistory,
  resendFailedTemplatedMarketingEmailCampaign,
  resendMarketingEmailDelivery,
  sendTemplatedMarketingEmailCampaign,
} from "@/lib/marketing"

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
  action: z.literal("send").optional(),
  recipientSource: z.enum(["EVENT_GUESTS", "PASTED_EMAILS", "BOTH"]).default("EVENT_GUESTS"),
  sourceEventId: optionalText(80),
  pastedEmails: z.string().max(200000).optional(),
  testRecipient: optionalEmail,
  campaignName: z.string().trim().min(1).max(120),
  utmCampaign: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(180),
  preheader: optionalText(220),
  replyTo: optionalEmail,
  ctaLabel: optionalText(80),
  ctaUrl: optionalText(500),
  emailFormat: z.enum(["BRANDED", "CUSTOM_HTML"]).default("BRANDED"),
  bodyTemplate: z.string().trim().min(1).max(40000),
  attachments: z
    .array(
      z.object({
        filename: z.string().trim().min(1).max(180),
        contentType: optionalText(120),
        size: z.coerce.number().int().min(0).max(5 * 1024 * 1024),
        content: z.string().min(1).max(7 * 1024 * 1024),
      }),
    )
    .max(5)
    .optional(),
  excludeCurrentEventGuests: z.boolean().default(false),
  audienceLabel: optionalText(160),
  includeDiscountCodes: z.boolean().default(false),
  codePrefix: optionalText(16),
  discountType: z.enum(["FIXED", "PERCENT"]).default("PERCENT"),
  amountValue: z.coerce.number().min(0).max(10000).optional(),
  expiresAt: optionalText(40),
  baseUrl: optionalText(500),
})

const resendFailedSchema = z.object({
  action: z.literal("resend_failed"),
  campaignId: z.string().trim().min(1).max(120),
  baseUrl: optionalText(500),
})

const resendDeliverySchema = z.object({
  action: z.literal("resend_delivery"),
  campaignId: z.string().trim().min(1).max(120),
  deliveryId: z.string().trim().min(1).max(120),
  baseUrl: optionalText(500),
})

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const campaigns = await getEventEmailCampaignHistory(eventId)

  return NextResponse.json({
    ok: true,
    campaigns,
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const authenticated = await isAdminAuthenticated().catch(() => false)

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 })
  }

  const { eventId } = await params
  const json = await request.json().catch(() => null)
  const action = json && typeof json === "object" && "action" in json ? (json as { action?: unknown }).action : undefined

  if (action === "resend_failed") {
    const parsed = resendFailedSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resend request." }, { status: 400 })
    }

    try {
      const result = await resendFailedTemplatedMarketingEmailCampaign({
        eventId,
        campaignId: parsed.data.campaignId,
        baseUrl: parsed.data.baseUrl || new URL(request.url).origin,
      })

      return NextResponse.json({
        ok: true,
        ...result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend failed emails."
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  if (action === "resend_delivery") {
    const parsed = resendDeliverySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid delivery resend request." }, { status: 400 })
    }

    try {
      const result = await resendMarketingEmailDelivery({
        eventId,
        campaignId: parsed.data.campaignId,
        deliveryId: parsed.data.deliveryId,
        baseUrl: parsed.data.baseUrl || new URL(request.url).origin,
      })

      return NextResponse.json({
        ok: true,
        ...result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend email."
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

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
      preheader: parsed.data.preheader,
      replyTo: parsed.data.replyTo,
      ctaLabel: parsed.data.ctaLabel,
      ctaUrl: parsed.data.ctaUrl,
      emailFormat: parsed.data.emailFormat,
      bodyTemplate: parsed.data.bodyTemplate,
      attachments: parsed.data.attachments,
      excludeCurrentEventGuests: parsed.data.excludeCurrentEventGuests,
      audienceLabel: parsed.data.audienceLabel,
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
