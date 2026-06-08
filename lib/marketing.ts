import "server-only"

import { getEmailProviderLabel, isEmailServiceConfigured, sendEmail } from "@/lib/email-service"
import { getPrismaClient } from "@/lib/prisma"

export type MarketingPlatformKey = "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "X" | "LINKEDIN" | "WHATSAPP" | "EMAIL"

type PublishMarketingPostInput = {
  eventId: string
  platform: MarketingPlatformKey
  campaignName: string
  utmCampaign: string
  caption: string
  targetUrl: string
  mediaUrls?: string[]
  objective?: string
  audience?: string
  budgetCents?: number
  scheduledAt?: string
}

type SendMarketingEmailInput = {
  eventId: string
  campaignName: string
  utmCampaign: string
  subject: string
  body: string
  targetUrl: string
  testRecipient?: string
}

type RecipientSource = "EVENT_GUESTS" | "PASTED_EMAILS" | "BOTH"
type EmailFormat = "BRANDED" | "CUSTOM_HTML"

type MarketingEmailAttachment = {
  filename: string
  contentType?: string
  size?: number
  content: string
}

type SendTemplatedMarketingEmailInput = {
  eventId: string
  sourceEventId?: string
  recipientSource: RecipientSource
  pastedEmails?: string
  testRecipient?: string
  campaignName: string
  utmCampaign: string
  subject: string
  preheader?: string
  replyTo?: string
  ctaLabel?: string
  emailFormat?: EmailFormat
  bodyTemplate: string
  attachments?: MarketingEmailAttachment[]
  includeDiscountCodes: boolean
  codePrefix?: string
  discountType?: "FIXED" | "PERCENT"
  amountValue?: number
  expiresAt?: string
  baseUrl: string
}

type DirectPublishInput = {
  platform: MarketingPlatformKey
  caption: string
  targetUrl: string
  mediaUrls?: string[]
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const maxEmailAttachments = 5
const maxEmailAttachmentBytes = 5 * 1024 * 1024
const maxEmailAttachmentTotalBytes = 15 * 1024 * 1024

function getMarketingPrismaClient() {
  const prisma = getPrismaClient()

  if (
    typeof prisma.marketingCampaign?.create !== "function" ||
    typeof prisma.marketingPost?.create !== "function"
  ) {
    throw new Error(
      "Marketing models are not available in the running Prisma Client. Run pnpm exec prisma generate and restart the dev server.",
    )
  }

  return prisma
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildHiddenPreheader(value?: string) {
  if (!value?.trim()) {
    return ""
  }

  return `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(value.trim())}</div>`
}

function isConfigured(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()))
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function parseEmails(value = "") {
  return [...new Set((value.match(emailPattern) || []).map(normalizeEmail).filter((email) => email.length <= 190))]
}

function buildEmailAttachments(attachments: MarketingEmailAttachment[] | undefined) {
  if (!attachments?.length) {
    return undefined
  }

  if (attachments.length > maxEmailAttachments) {
    throw new Error(`Attach up to ${maxEmailAttachments} files per campaign.`)
  }

  let totalBytes = 0

  return attachments.map((attachment) => {
    const filename = attachment.filename.trim()

    if (!filename) {
      throw new Error("Attachment filename is required.")
    }

    const content = Buffer.from(attachment.content, "base64")
    const declaredSize = typeof attachment.size === "number" ? attachment.size : content.byteLength

    if (content.byteLength === 0) {
      throw new Error(`${filename} is empty.`)
    }

    if (declaredSize > maxEmailAttachmentBytes || content.byteLength > maxEmailAttachmentBytes) {
      throw new Error(`${filename} is over the 5 MB file limit.`)
    }

    totalBytes += content.byteLength

    if (totalBytes > maxEmailAttachmentTotalBytes) {
      throw new Error("Attachments can total up to 15 MB per campaign.")
    }

    return {
      filename,
      content,
      contentType: attachment.contentType?.trim() || undefined,
    }
  })
}

function normalizeCodePrefix(value?: string) {
  const prefix = (value || "TEEZ")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16)

  return prefix || "TEEZ"
}

function buildCode(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12)

  return `${prefix}-${suffix}`.toUpperCase().slice(0, 40)
}

function buildAssignedDescription(campaignName: string, email: string) {
  const marker = `[assigned-email:${email}]`
  const maxCampaignLength = Math.max(0, 240 - marker.length - 1)
  const campaign = campaignName.slice(0, maxCampaignLength).trim()

  return campaign ? `${campaign} ${marker}` : marker
}

export function getMarketingIntegrationStatuses() {
  return [
    {
      platform: "INSTAGRAM" as const,
      label: "Instagram Business",
      configured: isConfigured(["INSTAGRAM_BUSINESS_ACCOUNT_ID", "META_PAGE_ACCESS_TOKEN"]),
      directPublish: true,
      requiredEnv: ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "META_PAGE_ACCESS_TOKEN"],
      note: "Requires an Instagram Business account connected to Meta.",
    },
    {
      platform: "FACEBOOK" as const,
      label: "Facebook Page",
      configured: isConfigured(["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"]),
      directPublish: true,
      requiredEnv: ["META_PAGE_ID", "META_PAGE_ACCESS_TOKEN"],
      note: "Publishes to the configured Facebook Page feed.",
    },
    {
      platform: "LINKEDIN" as const,
      label: "LinkedIn",
      configured: isConfigured(["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"]),
      directPublish: true,
      requiredEnv: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
      note: "Publishes a public LinkedIn post for the configured person or organization URN.",
    },
    {
      platform: "X" as const,
      label: "X",
      configured: isConfigured(["X_USER_ACCESS_TOKEN"]),
      directPublish: true,
      requiredEnv: ["X_USER_ACCESS_TOKEN"],
      note: "Requires an OAuth user access token with tweet write permission.",
    },
    {
      platform: "EMAIL" as const,
      label: "Email",
      configured: isEmailServiceConfigured(),
      directPublish: true,
      requiredEnv: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      note: isEmailServiceConfigured()
        ? `Sends through ${getEmailProviderLabel()} for ticket delivery and marketing.`
        : "Configure Resend for ticket delivery, event updates, and marketing campaigns. SMTP remains supported as a fallback.",
    },
    {
      platform: "TIKTOK" as const,
      label: "TikTok",
      configured: false,
      directPublish: false,
      requiredEnv: ["TikTok OAuth app review"],
      note: "Use generated captions and assets; direct TikTok posting needs OAuth upload approval.",
    },
    {
      platform: "WHATSAPP" as const,
      label: "WhatsApp",
      configured: false,
      directPublish: false,
      requiredEnv: ["Meta WhatsApp Business templates"],
      note: "Use generated share links; broadcast messaging needs approved templates and opt-in.",
    },
  ]
}

async function createMarketingCampaign(input: {
  eventId: string
  name: string
  utmCampaign: string
  objective?: string
  audience?: string
  budgetCents?: number
}) {
  const prisma = getMarketingPrismaClient()

  return prisma.marketingCampaign.create({
    data: {
      eventId: input.eventId,
      name: input.name,
      objective: input.objective || null,
      audience: input.audience || null,
      budgetCents: input.budgetCents ?? null,
      utmCampaign: input.utmCampaign,
      status: "ACTIVE",
    },
  })
}

async function recordMarketingPost(input: {
  campaignId: string
  platform: MarketingPlatformKey
  caption: string
  targetUrl: string
  mediaUrls?: string[]
  status: "DRAFT" | "READY" | "PUBLISHED" | "FAILED"
  scheduledAt?: string
  publishedAt?: Date | null
  externalId?: string | null
  externalUrl?: string | null
  errorMessage?: string | null
}) {
  const prisma = getMarketingPrismaClient()

  return prisma.marketingPost.create({
    data: {
      campaignId: input.campaignId,
      platform: input.platform,
      caption: input.caption,
      targetUrl: input.targetUrl,
      mediaUrls: input.mediaUrls?.length ? input.mediaUrls : undefined,
      status: input.status,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      publishedAt: input.publishedAt || null,
      externalId: input.externalId || null,
      externalUrl: input.externalUrl || null,
      errorMessage: input.errorMessage || null,
    },
  })
}

async function postToFacebook(input: DirectPublishInput) {
  const pageId = process.env.META_PAGE_ID
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN

  if (!pageId || !accessToken) {
    throw new Error("Facebook Page integration is not configured.")
  }

  const body = new URLSearchParams({
    access_token: accessToken,
    message: input.caption,
    link: input.targetUrl,
  })
  const response = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: "POST",
    body,
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Facebook publish failed.")
  }

  return {
    externalId: typeof payload?.id === "string" ? payload.id : null,
    externalUrl: typeof payload?.id === "string" ? `https://www.facebook.com/${payload.id}` : null,
  }
}

async function postToInstagram(input: DirectPublishInput) {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN
  const imageUrl = input.mediaUrls?.find((url) => /^https?:\/\//i.test(url))

  if (!accountId || !accessToken) {
    throw new Error("Instagram Business integration is not configured.")
  }

  if (!imageUrl) {
    throw new Error("Instagram direct publishing needs a public image URL. Upload a hero image first.")
  }

  const createBody = new URLSearchParams({
    access_token: accessToken,
    image_url: imageUrl,
    caption: `${input.caption}\n\n${input.targetUrl}`,
  })
  const createResponse = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
    method: "POST",
    body: createBody,
  })
  const createPayload = await createResponse.json().catch(() => null)

  if (!createResponse.ok || typeof createPayload?.id !== "string") {
    throw new Error(createPayload?.error?.message || "Instagram media creation failed.")
  }

  const publishBody = new URLSearchParams({
    access_token: accessToken,
    creation_id: createPayload.id,
  })
  const publishResponse = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
    method: "POST",
    body: publishBody,
  })
  const publishPayload = await publishResponse.json().catch(() => null)

  if (!publishResponse.ok) {
    throw new Error(publishPayload?.error?.message || "Instagram publish failed.")
  }

  return {
    externalId: typeof publishPayload?.id === "string" ? publishPayload.id : createPayload.id,
    externalUrl: null,
  }
}

async function postToLinkedIn(input: DirectPublishInput) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  const author = process.env.LINKEDIN_AUTHOR_URN

  if (!accessToken || !author) {
    throw new Error("LinkedIn integration is not configured.")
  }

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: `${input.caption}\n\n${input.targetUrl}`,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  })
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(responseText || "LinkedIn publish failed.")
  }

  const activityId = response.headers.get("x-restli-id")

  return {
    externalId: activityId,
    externalUrl: null,
  }
}

async function postToX(input: DirectPublishInput) {
  const accessToken = process.env.X_USER_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("X integration is not configured.")
  }

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `${input.caption}\n${input.targetUrl}`.slice(0, 280),
    }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || "X publish failed.")
  }

  const tweetId = typeof payload?.data?.id === "string" ? payload.data.id : null

  return {
    externalId: tweetId,
    externalUrl: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : null,
  }
}

async function publishDirectPost(input: DirectPublishInput) {
  if (input.platform === "FACEBOOK") {
    return postToFacebook(input)
  }

  if (input.platform === "INSTAGRAM") {
    return postToInstagram(input)
  }

  if (input.platform === "LINKEDIN") {
    return postToLinkedIn(input)
  }

  if (input.platform === "X") {
    return postToX(input)
  }

  throw new Error(`${input.platform} direct publishing is not available yet.`)
}

export async function publishMarketingPost(input: PublishMarketingPostInput) {
  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: input.objective,
    audience: input.audience,
    budgetCents: input.budgetCents,
  })

  if (input.scheduledAt) {
    const post = await recordMarketingPost({
      campaignId: campaign.id,
      platform: input.platform,
      caption: input.caption,
      targetUrl: input.targetUrl,
      mediaUrls: input.mediaUrls,
      status: "READY",
      scheduledAt: input.scheduledAt,
    })

    return {
      mode: "scheduled" as const,
      campaignId: campaign.id,
      postId: post.id,
      externalId: null,
      externalUrl: null,
    }
  }

  try {
    const result = await publishDirectPost(input)

    const post = await recordMarketingPost({
      campaignId: campaign.id,
      platform: input.platform,
      caption: input.caption,
      targetUrl: input.targetUrl,
      mediaUrls: input.mediaUrls,
      status: "PUBLISHED",
      publishedAt: new Date(),
      externalId: result.externalId,
      externalUrl: result.externalUrl,
    })

    return {
      mode: "published" as const,
      campaignId: campaign.id,
      postId: post.id,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish marketing post."

    const post = await recordMarketingPost({
      campaignId: campaign.id,
      platform: input.platform,
      caption: input.caption,
      targetUrl: input.targetUrl,
      mediaUrls: input.mediaUrls,
      status: "FAILED",
      errorMessage: message,
    })

    return {
      mode: "failed" as const,
      campaignId: campaign.id,
      postId: post.id,
      error: message,
    }
  }
}

function parseMediaUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

export async function processScheduledMarketingPosts(limit = 20) {
  const prisma = getPrismaClient()
  const posts = await prisma.marketingPost.findMany({
    where: {
      status: "READY",
      scheduledAt: {
        lte: new Date(),
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
    take: limit,
    include: {
      campaign: true,
    },
  })

  const results: Array<{
    postId: string
    platform: string
    status: "published" | "failed"
    error?: string
  }> = []

  for (const post of posts) {
    try {
      const result = await publishDirectPost({
        platform: post.platform as MarketingPlatformKey,
        caption: post.caption,
        targetUrl: post.targetUrl,
        mediaUrls: parseMediaUrls(post.mediaUrls),
      })

      await prisma.marketingPost.update({
        where: {
          id: post.id,
        },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          errorMessage: null,
        },
      })

      results.push({
        postId: post.id,
        platform: post.platform,
        status: "published",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled publish failed."

      await prisma.marketingPost.update({
        where: {
          id: post.id,
        },
        data: {
          status: "FAILED",
          errorMessage: message,
        },
      })

      results.push({
        postId: post.id,
        platform: post.platform,
        status: "failed",
        error: message,
      })
    }
  }

  return {
    processed: posts.length,
    published: results.filter((result) => result.status === "published").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  }
}

export async function getEventMarketingRecipients(eventId: string) {
  const prisma = getPrismaClient()
  const [orders, tickets] = await Promise.all([
    prisma.ticketOrder.findMany({
      where: {
        eventId,
        status: "PAID",
      },
      select: {
        customerName: true,
        customerEmail: true,
      },
    }),
    prisma.ticket.findMany({
      where: {
        eventId,
        order: {
          status: "PAID",
        },
      },
      select: {
        holderName: true,
        holderEmail: true,
      },
    }),
  ])

  const recipients = new Map<string, { name: string; email: string }>()

  orders.forEach((order) => {
    const email = order.customerEmail.trim().toLowerCase()
    if (email) {
      recipients.set(email, { name: order.customerName, email })
    }
  })

  tickets.forEach((ticket) => {
    const email = ticket.holderEmail.trim().toLowerCase()
    if (email && !recipients.has(email)) {
      recipients.set(email, { name: ticket.holderName, email })
    }
  })

  return [...recipients.values()]
}

async function getTemplatedEmailRecipients(input: SendTemplatedMarketingEmailInput) {
  if (input.testRecipient) {
    return [
      {
        name: "Test recipient",
        email: normalizeEmail(input.testRecipient),
      },
    ]
  }

  const recipients = new Map<string, { name: string; email: string }>()

  if (input.recipientSource === "EVENT_GUESTS" || input.recipientSource === "BOTH") {
    const guestRecipients = await getEventMarketingRecipients(input.sourceEventId || input.eventId)

    guestRecipients.forEach((recipient) => {
      recipients.set(recipient.email, recipient)
    })
  }

  if (input.recipientSource === "PASTED_EMAILS" || input.recipientSource === "BOTH") {
    parseEmails(input.pastedEmails).forEach((email) => {
      if (!recipients.has(email)) {
        recipients.set(email, {
          name: email.split("@")[0] || "Guest",
          email,
        })
      }
    })
  }

  return [...recipients.values()]
}

function formatMarketingEventDate(startsAt: Date | null) {
  if (!startsAt) {
    return "Date to be announced"
  }

  return startsAt.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatMarketingEventTime(startsAt: Date | null) {
  if (!startsAt) {
    return ""
  }

  return startsAt.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDiscountValue(input: SendTemplatedMarketingEmailInput) {
  if (!input.includeDiscountCodes) {
    return ""
  }

  if (input.discountType === "FIXED") {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 2,
    }).format((input.amountValue || 0))
  }

  return `${Math.round(input.amountValue || 0)}%`
}

function buildPublicUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.replace(/\/+$/, "")
  return `${trimmedBase}${path}`
}

function renderTemplate(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "")
}

async function createAssignedDiscountCodes(
  input: SendTemplatedMarketingEmailInput,
  recipients: Array<{ name: string; email: string }>,
) {
  if (!input.includeDiscountCodes) {
    return new Map<string, string>()
  }

  if (input.discountType === "PERCENT" && (!input.amountValue || input.amountValue < 1 || input.amountValue > 100)) {
    throw new Error("Percent discount must be between 1 and 100.")
  }

  if (input.discountType === "FIXED" && (!input.amountValue || input.amountValue <= 0)) {
    throw new Error("Fixed discount must be above $0.")
  }

  const prisma = getPrismaClient()
  const prefix = normalizeCodePrefix(input.codePrefix)
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  const codesByEmail = new Map<string, string>()

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("Discount expiry date is invalid.")
  }

  for (const recipient of recipients) {
    let code = ""

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextCode = buildCode(prefix)

      try {
        const voucher = await prisma.voucher.create({
          data: {
            eventId: input.eventId,
            code: nextCode,
            description: buildAssignedDescription(input.campaignName, recipient.email),
            discountType: input.discountType || "PERCENT",
            amountOffCents:
              input.discountType === "FIXED" && typeof input.amountValue === "number"
                ? Math.round(input.amountValue * 100)
                : null,
            percentOff:
              input.discountType !== "FIXED" && typeof input.amountValue === "number"
                ? Math.round(input.amountValue)
                : null,
            minimumQuantity: null,
            maxRedemptions: 1,
            startsAt: null,
            expiresAt,
            isActive: true,
          },
        })
        code = voucher.code
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : ""

        if (!/Unique constraint|unique/i.test(message) || attempt === 4) {
          throw error
        }
      }
    }

    if (!code) {
      throw new Error(`Unable to create a discount code for ${recipient.email}.`)
    }

    codesByEmail.set(recipient.email, code)
  }

  return codesByEmail
}

function buildMarketingEmailHtml(input: {
  title: string
  body: string
  targetUrl: string
  preheader?: string
  ctaLabel?: string
}) {
  return `
    <div style="font-family: Helvetica Neue, Arial, sans-serif; background: #f7eddb; padding: 32px 16px; color: #2b2b2b;">
      ${buildHiddenPreheader(input.preheader)}
      <div style="max-width: 680px; margin: 0 auto; background: #fffaf2; border: 1px solid rgba(197,122,58,0.22); border-radius: 24px; overflow: hidden;">
        <div style="padding: 32px;">
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #c57a3a;">TEEZ Events</div>
          <h1 style="font-family: Georgia, serif; font-size: 36px; margin: 12px 0 16px;">${escapeHtml(input.title)}</h1>
          <div style="line-height: 1.7; color: #6d5f51; white-space: pre-line;">${escapeHtml(input.body)}</div>
          <p style="margin: 28px 0 0;">
            <a href="${escapeHtml(input.targetUrl)}" style="display: inline-block; background: #c57a3a; color: #fffaf2; text-decoration: none; padding: 14px 20px; border-radius: 999px; font-weight: 700;">${escapeHtml(input.ctaLabel || "Open event")}</a>
          </p>
        </div>
      </div>
    </div>
  `
}

function buildCustomMarketingEmailHtml(input: {
  html: string
  preheader?: string
}) {
  return `${buildHiddenPreheader(input.preheader)}${input.html}`
}

export async function sendTemplatedMarketingEmailCampaign(input: SendTemplatedMarketingEmailInput) {
  const prisma = getPrismaClient()
  const event = await prisma.event.findUnique({
    where: {
      id: input.eventId,
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: true,
      address: true,
      checkoutEnabled: true,
    },
  })

  if (!event) {
    throw new Error("Event not found.")
  }

  const recipients = await getTemplatedEmailRecipients(input)

  if (recipients.length === 0) {
    throw new Error("No recipient emails found.")
  }

  if (recipients.length > 5000) {
    throw new Error("Send at most 5,000 emails at a time.")
  }

  const codesByEmail = await createAssignedDiscountCodes(input, recipients)
  const attachments = buildEmailAttachments(input.attachments)
  const eventUrl = buildPublicUrl(input.baseUrl, `/events/${encodeURIComponent(event.id)}`)
  const baseCheckoutUrl = buildPublicUrl(input.baseUrl, `/checkout/${encodeURIComponent(event.id)}`)
  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: input.includeDiscountCodes ? "Discount email campaign" : "Event email campaign",
    audience: input.testRecipient ? "Test recipient" : input.recipientSource,
  })

  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []

  for (const recipient of recipients) {
    const discountCode = codesByEmail.get(recipient.email) || ""
    const checkoutUrl = discountCode ? `${baseCheckoutUrl}?voucher=${encodeURIComponent(discountCode)}` : baseCheckoutUrl
    const firstName = recipient.name.trim().split(/\s+/)[0] || "there"
    const variables = {
      name: recipient.name,
      firstName,
      email: recipient.email,
      eventTitle: event.title,
      eventDate: formatMarketingEventDate(event.startsAt),
      eventTime: formatMarketingEventTime(event.startsAt),
      venue: event.venue || event.address || "Venue to be announced",
      eventUrl,
      checkoutUrl,
      discountCode,
      discountValue: formatDiscountValue(input),
    }
    const subject = renderTemplate(input.subject, variables)
    const body = renderTemplate(input.bodyTemplate, variables)
    const preheader = renderTemplate(input.preheader || "", variables)
    const html =
      input.emailFormat === "CUSTOM_HTML"
        ? buildCustomMarketingEmailHtml({
            html: body,
            preheader,
          })
        : buildMarketingEmailHtml({
            title: event.title,
            body,
            targetUrl: checkoutUrl,
            preheader,
            ctaLabel: input.ctaLabel,
          })

    try {
      await sendEmail({
        to: recipient.email,
        subject,
        html,
        text: input.emailFormat === "CUSTOM_HTML" ? stripHtml(body) : body,
        replyTo: input.replyTo,
        attachments,
      })
      sent.push(recipient.email)
    } catch (error) {
      failed.push({
        email: recipient.email,
        error: error instanceof Error ? error.message : "Email send failed.",
      })
    }
  }

  const status = failed.length > 0 && sent.length === 0 ? "FAILED" : "PUBLISHED"
  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: `${input.subject}\n\n${input.bodyTemplate}`,
    targetUrl: eventUrl,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    errorMessage: failed.length > 0 ? `${failed.length} email(s) failed.` : null,
  })

  return {
    campaignId: campaign.id,
    postId: post.id,
    total: recipients.length,
    sent: sent.length,
    failed: failed.length,
    generatedCodes: codesByEmail.size,
  }
}

export async function sendMarketingEmailCampaign(input: SendMarketingEmailInput) {
  const prisma = getPrismaClient()
  const event = await prisma.event.findUnique({
    where: {
      id: input.eventId,
    },
    select: {
      id: true,
      title: true,
    },
  })

  if (!event) {
    throw new Error("Event not found.")
  }

  const recipients = input.testRecipient
    ? [{ name: "Test recipient", email: input.testRecipient.trim().toLowerCase() }]
    : await getEventMarketingRecipients(input.eventId)

  if (recipients.length === 0) {
    throw new Error("No paid guest emails found for this event.")
  }

  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: "Email marketing",
    audience: input.testRecipient ? "Test recipient" : "Paid guests",
  })

  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: input.subject,
        html: buildMarketingEmailHtml({
          title: event.title,
          body: input.body,
          targetUrl: input.targetUrl,
        }),
      })
      sent.push(recipient.email)
    } catch (error) {
      failed.push({
        email: recipient.email,
        error: error instanceof Error ? error.message : "Email send failed.",
      })
    }
  }

  const status = failed.length > 0 && sent.length === 0 ? "FAILED" : "PUBLISHED"
  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: `${input.subject}\n\n${input.body}`,
    targetUrl: input.targetUrl,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    errorMessage: failed.length > 0 ? `${failed.length} email(s) failed.` : null,
  })

  return {
    campaignId: campaign.id,
    postId: post.id,
    total: recipients.length,
    sent: sent.length,
    failed: failed.length,
  }
}
