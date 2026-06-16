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
  ctaUrl?: string
  emailFormat?: EmailFormat
  bodyTemplate: string
  attachments?: MarketingEmailAttachment[]
  excludeCurrentEventGuests?: boolean
  audienceLabel?: string
  includeDiscountCodes: boolean
  codePrefix?: string
  discountType?: "FIXED" | "PERCENT"
  amountValue?: number
  expiresAt?: string
  scheduledAt?: string
  baseUrl: string
}

type MarketingEmailRecipient = {
  name: string
  email: string
  discountCount?: number
}

type MarketingEmailEventContext = {
  event: {
    id: string
    title: string
    startsAt: Date | null
    venue: string | null
    address: string | null
    checkoutEnabled?: boolean
  }
  sourceEvent: {
    id: string
    title: string
    startsAt: Date | null
    venue: string | null
    address: string | null
  } | null
  eventUrl: string
  baseCheckoutUrl: string
}

type RenderedMarketingEmail = {
  subject: string
  body: string
  html: string
  text: string
  targetUrl: string
  discountCode: string
  discountCodes: string[]
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
    typeof prisma.marketingPost?.create !== "function" ||
    typeof prisma.marketingEmailCampaignDetail?.create !== "function" ||
    typeof prisma.marketingEmailDelivery?.create !== "function"
  ) {
    throw new Error(
      "Marketing email tracking models are not available in the running Prisma Client. Run pnpm exec prisma generate and restart the dev server.",
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
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
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
      status: input.status || "ACTIVE",
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

function getAttachmentNames(attachments: MarketingEmailAttachment[] | undefined) {
  if (!attachments?.length) {
    return undefined
  }

  return attachments.map((attachment) => ({
    filename: attachment.filename,
    contentType: attachment.contentType || "application/octet-stream",
    size: attachment.size || 0,
  }))
}

async function recordEmailCampaignDetail(input: {
  campaignId: string
  data: SendTemplatedMarketingEmailInput
}) {
  const prisma = getMarketingPrismaClient()
  const expiresAt = input.data.expiresAt ? new Date(input.data.expiresAt) : null
  const scheduledSendAt = input.data.scheduledAt ? new Date(input.data.scheduledAt) : null

  return prisma.marketingEmailCampaignDetail.create({
    data: {
      campaignId: input.campaignId,
      eventId: input.data.eventId,
      sourceEventId: input.data.sourceEventId || null,
      recipientSource: input.data.recipientSource,
      pastedEmails: input.data.pastedEmails || null,
      audienceLabel: input.data.audienceLabel || null,
      testRecipient: input.data.testRecipient || null,
      subject: input.data.subject,
      preheader: input.data.preheader || null,
      replyTo: input.data.replyTo || null,
      ctaLabel: input.data.ctaLabel || null,
      ctaUrl: input.data.ctaUrl || null,
      emailFormat: input.data.emailFormat || "BRANDED",
      bodyTemplate: input.data.bodyTemplate,
      excludeCurrentEventGuests: Boolean(input.data.excludeCurrentEventGuests),
      includeDiscountCodes: input.data.includeDiscountCodes,
      codePrefix: input.data.codePrefix || null,
      discountType: input.data.includeDiscountCodes ? input.data.discountType || "PERCENT" : null,
      amountValue: typeof input.data.amountValue === "number" ? input.data.amountValue : null,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      baseUrl: input.data.baseUrl || null,
      scheduledSendAt: scheduledSendAt && !Number.isNaN(scheduledSendAt.getTime()) ? scheduledSendAt : null,
      attachmentNames: getAttachmentNames(input.data.attachments),
    },
  })
}

function getProviderMessageId(result: unknown) {
  if (!result || typeof result !== "object") {
    return null
  }

  const payload = result as { id?: unknown; messageId?: unknown; message?: { id?: unknown } }
  const value = payload.id || payload.messageId || payload.message?.id

  return typeof value === "string" ? value : null
}

async function recordEmailDelivery(input: {
  campaignId: string
  eventId: string
  recipient: MarketingEmailRecipient
  rendered: RenderedMarketingEmail
  status: "PENDING" | "SENT" | "FAILED"
  errorMessage?: string | null
  providerMessageId?: string | null
}) {
  const prisma = getMarketingPrismaClient()
  const attemptedAt = input.status === "PENDING" ? null : new Date()

  return prisma.marketingEmailDelivery.create({
    data: {
      campaignId: input.campaignId,
      eventId: input.eventId,
      recipientEmail: input.recipient.email,
      recipientName: input.recipient.name || null,
      subject: input.rendered.subject,
      targetUrl: input.rendered.targetUrl,
      discountCode: input.rendered.discountCode || null,
      discountCodes: input.rendered.discountCodes.length > 0 ? input.rendered.discountCodes : undefined,
      status: input.status,
      attemptCount: input.status === "PENDING" ? 0 : 1,
      lastAttemptAt: attemptedAt,
      sentAt: input.status === "SENT" ? attemptedAt : null,
      errorMessage: input.errorMessage || null,
      providerMessageId: input.providerMessageId || null,
    },
  })
}

async function updateEmailDeliveryAttempt(input: {
  deliveryId: string
  rendered: RenderedMarketingEmail
  status: "SENT" | "FAILED"
  errorMessage?: string | null
  providerMessageId?: string | null
}) {
  const prisma = getMarketingPrismaClient()
  const attemptedAt = new Date()

  return prisma.marketingEmailDelivery.update({
    where: {
      id: input.deliveryId,
    },
    data: {
      subject: input.rendered.subject,
      targetUrl: input.rendered.targetUrl,
      discountCode: input.rendered.discountCode || null,
      discountCodes: input.rendered.discountCodes.length > 0 ? input.rendered.discountCodes : undefined,
      status: input.status,
      attemptCount: {
        increment: 1,
      },
      lastAttemptAt: attemptedAt,
      sentAt: input.status === "SENT" ? attemptedAt : null,
      errorMessage: input.errorMessage || null,
      providerMessageId: input.providerMessageId || null,
    },
  })
}

async function attachDeliveriesToPost(campaignId: string, postId: string) {
  const prisma = getMarketingPrismaClient()

  await prisma.marketingEmailDelivery.updateMany({
    where: {
      campaignId,
      postId: null,
    },
    data: {
      postId,
    },
  })
}

async function updateCampaignStatusFromFailures(campaignId: string, failedCount: number) {
  const prisma = getMarketingPrismaClient()

  await prisma.marketingCampaign.update({
    where: {
      id: campaignId,
    },
    data: {
      status: failedCount > 0 ? "ACTIVE" : "COMPLETED",
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
      if (post.platform === "EMAIL") {
        const result = await sendScheduledTemplatedMarketingEmailCampaign({
          campaignId: post.campaignId,
          postId: post.id,
          baseUrl: post.targetUrl ? new URL(post.targetUrl).origin : undefined,
        })

        results.push({
          postId: post.id,
          platform: post.platform,
          status: result.status === "FAILED" ? "failed" : "published",
          error: result.failed > 0 ? `${result.failed} email(s) failed.` : undefined,
        })
        continue
      }

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
        quantity: true,
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
        order: {
          select: {
            customerEmail: true,
          },
        },
      },
    }),
  ])

  const recipients = new Map<string, MarketingEmailRecipient>()

  function addRecipient(input: { name: string; email: string; discountCount: number }) {
    const email = normalizeEmail(input.email)

    if (!email) {
      return
    }

    const existing = recipients.get(email)

    if (existing) {
      recipients.set(email, {
        ...existing,
        name: existing.name || input.name,
        discountCount: Math.max(1, existing.discountCount || 1) + Math.max(1, input.discountCount),
      })
      return
    }

    recipients.set(email, {
      name: input.name,
      email,
      discountCount: Math.max(1, input.discountCount),
    })
  }

  orders.forEach((order) => {
    addRecipient({
      name: order.customerName,
      email: order.customerEmail,
      discountCount: order.quantity,
    })
  })

  tickets.forEach((ticket) => {
    const holderEmail = normalizeEmail(ticket.holderEmail)
    const buyerEmail = normalizeEmail(ticket.order.customerEmail)

    if (holderEmail && holderEmail !== buyerEmail && !recipients.has(holderEmail)) {
      addRecipient({
        name: ticket.holderName,
        email: holderEmail,
        discountCount: 1,
      })
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
        discountCount: 1,
      },
    ]
  }

  const recipients = new Map<string, MarketingEmailRecipient>()

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
          discountCount: 1,
        })
      }
    })
  }

  if (input.excludeCurrentEventGuests) {
    const currentEventRecipients = await getEventMarketingRecipients(input.eventId)

    currentEventRecipients.forEach((recipient) => {
      recipients.delete(recipient.email)
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
  recipients: MarketingEmailRecipient[],
) {
  if (!input.includeDiscountCodes) {
    return new Map<string, string[]>()
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
  const codesByEmail = new Map<string, string[]>()

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("Discount expiry date is invalid.")
  }

  for (const recipient of recipients) {
    const codeCount = Math.max(1, Math.min(Math.round(recipient.discountCount || 1), 25))
    const codes: string[] = []

    for (let codeIndex = 0; codeIndex < codeCount; codeIndex += 1) {
      let code = ""

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const nextCode = buildCode(prefix)

        try {
          const voucher = await prisma.voucher.create({
            data: {
              eventId: input.eventId,
              code: nextCode,
              description: buildAssignedDescription(
                `${input.campaignName} code ${codeIndex + 1} of ${codeCount}`,
                recipient.email,
              ),
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

      codes.push(code)
    }

    codesByEmail.set(recipient.email, codes)
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
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: #c57a3a;">Teez Events Co.</div>
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

async function getMarketingEmailEventContext(input: SendTemplatedMarketingEmailInput): Promise<MarketingEmailEventContext> {
  const prisma = getPrismaClient()
  const [event, sourceEvent] = await Promise.all([
    prisma.event.findUnique({
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
    }),
    input.sourceEventId
      ? prisma.event.findUnique({
          where: {
            id: input.sourceEventId,
          },
          select: {
            id: true,
            title: true,
            startsAt: true,
            venue: true,
            address: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!event) {
    throw new Error("Event not found.")
  }

  return {
    event,
    sourceEvent,
    eventUrl: buildPublicUrl(input.baseUrl, `/events/${encodeURIComponent(event.id)}`),
    baseCheckoutUrl: buildPublicUrl(input.baseUrl, `/checkout/${encodeURIComponent(event.id)}`),
  }
}

function renderMarketingEmailForRecipient(input: {
  campaign: SendTemplatedMarketingEmailInput
  context: MarketingEmailEventContext
  recipient: MarketingEmailRecipient
  discountCodes?: string[]
}) {
  const discountCodes = input.discountCodes?.filter(Boolean) || []
  const discountCode = discountCodes[0] || ""
  const discountCodesText = discountCodes.length > 0 ? discountCodes.map((code, index) => `${index + 1}. ${code}`).join("\n") : ""
  const checkoutUrl = discountCode
    ? `${input.context.baseCheckoutUrl}?voucher=${encodeURIComponent(discountCode)}`
    : input.context.baseCheckoutUrl
  const firstName = input.recipient.name.trim().split(/\s+/)[0] || "there"
  const variables = {
    name: input.recipient.name,
    firstName,
    email: input.recipient.email,
    eventTitle: input.context.event.title,
    eventDate: formatMarketingEventDate(input.context.event.startsAt),
    eventTime: formatMarketingEventTime(input.context.event.startsAt),
    venue: input.context.event.venue || input.context.event.address || "Venue to be announced",
    eventUrl: input.context.eventUrl,
    checkoutUrl,
    discountCode,
    discountCodes: discountCodesText,
    discountCodeCount: discountCodes.length.toString(),
    discountValue: formatDiscountValue(input.campaign),
    sourceEventTitle: input.context.sourceEvent?.title || input.context.event.title,
    sourceEventDate: formatMarketingEventDate(input.context.sourceEvent?.startsAt || input.context.event.startsAt),
    sourceEventVenue:
      input.context.sourceEvent?.venue ||
      input.context.sourceEvent?.address ||
      input.context.event.venue ||
      input.context.event.address ||
      "Venue to be announced",
  }
  const subject = renderTemplate(input.campaign.subject, variables)
  const body = renderTemplate(input.campaign.bodyTemplate, variables)
  const preheader = renderTemplate(input.campaign.preheader || "", variables)
  const ctaUrl = renderTemplate(input.campaign.ctaUrl || "", variables).trim()
  const targetUrl = ctaUrl || checkoutUrl
  const html =
    input.campaign.emailFormat === "CUSTOM_HTML"
      ? buildCustomMarketingEmailHtml({
          html: body,
          preheader,
        })
      : buildMarketingEmailHtml({
          title: input.context.event.title,
          body,
          targetUrl,
          preheader,
          ctaLabel: input.campaign.ctaLabel,
        })

  return {
    subject,
    body,
    html,
    text: input.campaign.emailFormat === "CUSTOM_HTML" ? stripHtml(body) : body,
    targetUrl,
    discountCode,
    discountCodes,
  } satisfies RenderedMarketingEmail
}

async function deliverMarketingEmail(input: {
  campaignId: string
  recipient: MarketingEmailRecipient
  rendered: RenderedMarketingEmail
  replyTo?: string
  attachments?: ReturnType<typeof buildEmailAttachments>
  utmCampaign: string
}) {
  return sendEmail({
    to: input.recipient.email,
    subject: input.rendered.subject,
    html: input.rendered.html,
    text: input.rendered.text,
    replyTo: input.replyTo,
    attachments: input.attachments,
    headers: {
      "X-TEEZ-Campaign-ID": input.campaignId,
    },
    tags: [
      {
        name: "campaign",
        value: input.utmCampaign.slice(0, 128),
      },
    ],
  })
}

function buildEmailCampaignCaption(input: SendTemplatedMarketingEmailInput) {
  return `${input.subject}\n\n${input.bodyTemplate}`
}

function getScheduledDate(value?: string) {
  if (!value?.trim()) {
    throw new Error("Choose a date and time before scheduling this email campaign.")
  }

  const scheduledAt = new Date(value)

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Scheduled send date is invalid.")
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new Error("Scheduled send date must be in the future.")
  }

  return scheduledAt
}

function assertNoScheduledAttachments(input: SendTemplatedMarketingEmailInput) {
  if (input.attachments?.length) {
    throw new Error("Scheduled email sends cannot include attachments yet. Remove attachments or send the campaign now.")
  }
}

async function sendTemplatedMarketingEmailForCampaign(
  input: SendTemplatedMarketingEmailInput,
  campaignId: string,
  options: {
    postId?: string
  } = {},
) {
  const prisma = getMarketingPrismaClient()
  const context = await getMarketingEmailEventContext(input)
  const recipients = await getTemplatedEmailRecipients(input)

  if (recipients.length === 0) {
    throw new Error("No recipient emails found.")
  }

  if (recipients.length > 5000) {
    throw new Error("Send at most 5,000 emails at a time.")
  }

  const codesByEmail = await createAssignedDiscountCodes(input, recipients)
  const attachments = buildEmailAttachments(input.attachments)

  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []

  for (const recipient of recipients) {
    const rendered = renderMarketingEmailForRecipient({
      campaign: input,
      context,
      recipient,
      discountCodes: codesByEmail.get(recipient.email),
    })
    const deliveryRecord = await recordEmailDelivery({
      campaignId,
      eventId: input.eventId,
      recipient,
      rendered,
      status: "PENDING",
    })

    try {
      const delivery = await deliverMarketingEmail({
        campaignId,
        recipient,
        rendered,
        replyTo: input.replyTo,
        attachments,
        utmCampaign: input.utmCampaign,
      })
      await updateEmailDeliveryAttempt({
        deliveryId: deliveryRecord.id,
        rendered,
        status: "SENT",
        providerMessageId: getProviderMessageId(delivery),
      })
      sent.push(recipient.email)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email send failed."
      await updateEmailDeliveryAttempt({
        deliveryId: deliveryRecord.id,
        rendered,
        status: "FAILED",
        errorMessage: message,
      })
      failed.push({
        email: recipient.email,
        error: message,
      })
    }
  }

  const status: "FAILED" | "PUBLISHED" = failed.length > 0 && sent.length === 0 ? "FAILED" : "PUBLISHED"
  const postData = {
    caption: buildEmailCampaignCaption(input),
    targetUrl: context.eventUrl,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    errorMessage: failed.length > 0 ? `${failed.length} email(s) failed.` : null,
  }
  const post = options.postId
    ? await prisma.marketingPost.update({
        where: {
          id: options.postId,
        },
        data: postData,
      })
    : await recordMarketingPost({
        campaignId,
        platform: "EMAIL",
        ...postData,
      })

  await attachDeliveriesToPost(campaignId, post.id)
  await updateCampaignStatusFromFailures(campaignId, failed.length)

  return {
    campaignId,
    postId: post.id,
    total: recipients.length,
    sent: sent.length,
    failed: failed.length,
    generatedCodes: [...codesByEmail.values()].reduce((total, codes) => total + codes.length, 0),
    status,
  }
}

export async function sendTemplatedMarketingEmailCampaign(input: SendTemplatedMarketingEmailInput) {
  const recipients = await getTemplatedEmailRecipients(input)

  if (recipients.length === 0) {
    throw new Error("No recipient emails found.")
  }

  if (recipients.length > 5000) {
    throw new Error("Send at most 5,000 emails at a time.")
  }

  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: input.includeDiscountCodes ? "Discount email campaign" : "Event email campaign",
    audience: input.testRecipient ? "Test recipient" : input.audienceLabel || input.recipientSource,
  })
  await recordEmailCampaignDetail({
    campaignId: campaign.id,
    data: input,
  })

  return sendTemplatedMarketingEmailForCampaign(input, campaign.id)
}

export async function saveTemplatedMarketingEmailDraft(input: SendTemplatedMarketingEmailInput) {
  const context = await getMarketingEmailEventContext(input)
  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: input.includeDiscountCodes ? "Discount email draft" : "Event email draft",
    audience: input.testRecipient ? "Test recipient" : input.audienceLabel || input.recipientSource,
    status: "DRAFT",
  })
  await recordEmailCampaignDetail({
    campaignId: campaign.id,
    data: input,
  })
  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: buildEmailCampaignCaption(input),
    targetUrl: context.eventUrl,
    status: "DRAFT",
  })

  return {
    campaignId: campaign.id,
    postId: post.id,
    mode: "draft" as const,
  }
}

export async function scheduleTemplatedMarketingEmailCampaign(input: SendTemplatedMarketingEmailInput) {
  assertNoScheduledAttachments(input)
  const scheduledAt = getScheduledDate(input.scheduledAt)
  const [context, recipients] = await Promise.all([getMarketingEmailEventContext(input), getTemplatedEmailRecipients(input)])

  if (recipients.length === 0) {
    throw new Error("No recipient emails found for this scheduled campaign.")
  }

  if (recipients.length > 5000) {
    throw new Error("Schedule at most 5,000 emails at a time.")
  }

  const campaign = await createMarketingCampaign({
    eventId: input.eventId,
    name: input.campaignName,
    utmCampaign: input.utmCampaign,
    objective: input.includeDiscountCodes ? "Scheduled discount email campaign" : "Scheduled event email campaign",
    audience: input.testRecipient ? "Test recipient" : input.audienceLabel || input.recipientSource,
    status: "ACTIVE",
  })
  await recordEmailCampaignDetail({
    campaignId: campaign.id,
    data: {
      ...input,
      scheduledAt: scheduledAt.toISOString(),
    },
  })
  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: buildEmailCampaignCaption(input),
    targetUrl: context.eventUrl,
    status: "READY",
    scheduledAt: scheduledAt.toISOString(),
  })

  return {
    campaignId: campaign.id,
    postId: post.id,
    mode: "scheduled" as const,
    scheduledAt: scheduledAt.toISOString(),
    estimatedRecipients: recipients.length,
  }
}

export async function sendScheduledTemplatedMarketingEmailCampaign(input: {
  campaignId: string
  postId: string
  baseUrl?: string
}) {
  const prisma = getMarketingPrismaClient()
  const campaign = await prisma.marketingCampaign.findUnique({
    where: {
      id: input.campaignId,
    },
    include: {
      emailDetails: true,
    },
  })

  if (!campaign || !campaign.emailDetails) {
    throw new Error("Scheduled email campaign details were not found.")
  }

  const campaignInput = buildInputFromEmailDetail({
    detail: campaign.emailDetails,
    campaignName: campaign.name,
    utmCampaign: campaign.utmCampaign,
    baseUrl: input.baseUrl || campaign.emailDetails.baseUrl || "",
  })

  return sendTemplatedMarketingEmailForCampaign(campaignInput, campaign.id, {
    postId: input.postId,
  })
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

function parseStoredDiscountCodes(value: unknown, fallback?: string | null) {
  const codes = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

  if (codes.length > 0) {
    return codes
  }

  return fallback ? [fallback] : []
}

function parseRecipientSource(value: string): RecipientSource {
  return value === "PASTED_EMAILS" || value === "BOTH" ? value : "EVENT_GUESTS"
}

function parseEmailFormat(value: string): EmailFormat {
  return value === "CUSTOM_HTML" ? "CUSTOM_HTML" : "BRANDED"
}

function buildInputFromEmailDetail(input: {
  detail: {
    eventId: string
    sourceEventId: string | null
    recipientSource: string
    pastedEmails: string | null
    audienceLabel: string | null
    testRecipient: string | null
    subject: string
    preheader: string | null
    replyTo: string | null
    ctaLabel: string | null
    ctaUrl: string | null
    emailFormat: string
    bodyTemplate: string
    excludeCurrentEventGuests: boolean
    includeDiscountCodes: boolean
    codePrefix: string | null
    discountType: "FIXED" | "PERCENT" | null
    amountValue: number | null
    expiresAt: Date | null
    baseUrl: string | null
    scheduledSendAt?: Date | null
  }
  campaignName: string
  utmCampaign: string
  baseUrl: string
}) {
  return {
    eventId: input.detail.eventId,
    sourceEventId: input.detail.sourceEventId || undefined,
    recipientSource: parseRecipientSource(input.detail.recipientSource),
    pastedEmails: input.detail.pastedEmails || undefined,
    campaignName: input.campaignName,
    utmCampaign: input.utmCampaign,
    subject: input.detail.subject,
    preheader: input.detail.preheader || undefined,
    replyTo: input.detail.replyTo || undefined,
    ctaLabel: input.detail.ctaLabel || undefined,
    ctaUrl: input.detail.ctaUrl || undefined,
    emailFormat: parseEmailFormat(input.detail.emailFormat),
    bodyTemplate: input.detail.bodyTemplate,
    excludeCurrentEventGuests: input.detail.excludeCurrentEventGuests,
    audienceLabel: input.detail.audienceLabel || undefined,
    includeDiscountCodes: input.detail.includeDiscountCodes,
    codePrefix: input.detail.codePrefix || undefined,
    discountType: input.detail.discountType || "PERCENT",
    amountValue: input.detail.amountValue ?? undefined,
    expiresAt: input.detail.expiresAt ? input.detail.expiresAt.toISOString() : undefined,
    scheduledAt: input.detail.scheduledSendAt ? input.detail.scheduledSendAt.toISOString() : undefined,
    baseUrl: input.baseUrl || input.detail.baseUrl || "",
  } satisfies SendTemplatedMarketingEmailInput
}

export async function getEventEmailCampaignHistory(eventId: string) {
  try {
    const prisma = getMarketingPrismaClient()
    const campaigns = await prisma.marketingCampaign.findMany({
      where: {
        eventId,
        OR: [
          {
            emailDetails: {
              isNot: null,
            },
          },
          {
            posts: {
              some: {
                platform: "EMAIL",
              },
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      include: {
        emailDetails: true,
        posts: {
          where: {
            platform: "EMAIL",
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        emailDeliveries: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 5000,
        },
      },
    })

    return campaigns.map((campaign) => {
      const deliveries = [...campaign.emailDeliveries].sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "FAILED" ? -1 : right.status === "FAILED" ? 1 : 0
        }

        return right.updatedAt.getTime() - left.updatedAt.getTime()
      })

      return {
        id: campaign.id,
        name: campaign.name,
        utmCampaign: campaign.utmCampaign,
        status: campaign.status,
        audience: campaign.audience,
        objective: campaign.objective,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        post: campaign.posts[0]
          ? {
              id: campaign.posts[0].id,
              status: campaign.posts[0].status,
              caption: campaign.posts[0].caption,
              targetUrl: campaign.posts[0].targetUrl,
              errorMessage: campaign.posts[0].errorMessage,
              scheduledAt: toIso(campaign.posts[0].scheduledAt),
              publishedAt: toIso(campaign.posts[0].publishedAt),
              createdAt: campaign.posts[0].createdAt.toISOString(),
            }
          : null,
        detail: campaign.emailDetails
          ? {
              sourceEventId: campaign.emailDetails.sourceEventId,
              recipientSource: campaign.emailDetails.recipientSource,
              pastedEmails: campaign.emailDetails.pastedEmails,
              audienceLabel: campaign.emailDetails.audienceLabel,
              testRecipient: campaign.emailDetails.testRecipient,
              subject: campaign.emailDetails.subject,
              preheader: campaign.emailDetails.preheader,
              replyTo: campaign.emailDetails.replyTo,
              ctaLabel: campaign.emailDetails.ctaLabel,
              ctaUrl: campaign.emailDetails.ctaUrl,
              emailFormat: campaign.emailDetails.emailFormat,
              bodyTemplate: campaign.emailDetails.bodyTemplate,
              excludeCurrentEventGuests: campaign.emailDetails.excludeCurrentEventGuests,
              includeDiscountCodes: campaign.emailDetails.includeDiscountCodes,
              codePrefix: campaign.emailDetails.codePrefix,
              discountType: campaign.emailDetails.discountType,
              amountValue: campaign.emailDetails.amountValue,
              expiresAt: toIso(campaign.emailDetails.expiresAt),
              baseUrl: campaign.emailDetails.baseUrl,
              scheduledSendAt: toIso(campaign.emailDetails.scheduledSendAt),
              attachmentNames: campaign.emailDetails.attachmentNames,
            }
          : null,
        total: deliveries.length,
        sent: deliveries.filter((delivery) => delivery.status === "SENT").length,
        failed: deliveries.filter((delivery) => delivery.status === "FAILED").length,
        deliveries: deliveries.map((delivery) => ({
          id: delivery.id,
          recipientEmail: delivery.recipientEmail,
          recipientName: delivery.recipientName,
          subject: delivery.subject,
          targetUrl: delivery.targetUrl,
          discountCode: delivery.discountCode,
          discountCodes: parseStoredDiscountCodes(delivery.discountCodes, delivery.discountCode),
          status: delivery.status,
          attemptCount: delivery.attemptCount,
          lastAttemptAt: toIso(delivery.lastAttemptAt),
          sentAt: toIso(delivery.sentAt),
          errorMessage: delivery.errorMessage,
          providerMessageId: delivery.providerMessageId,
          createdAt: delivery.createdAt.toISOString(),
          updatedAt: delivery.updatedAt.toISOString(),
        })),
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""

    if (/does not exist|Unknown arg|marketingEmailCampaignDetail|marketingEmailDelivery/i.test(message)) {
      return []
    }

    throw error
  }
}

export async function resendFailedTemplatedMarketingEmailCampaign(input: {
  eventId: string
  campaignId: string
  baseUrl: string
}) {
  const prisma = getMarketingPrismaClient()
  const campaign = await prisma.marketingCampaign.findFirst({
    where: {
      id: input.campaignId,
      eventId: input.eventId,
    },
    include: {
      emailDetails: true,
      emailDeliveries: {
        where: {
          status: "FAILED",
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  })

  if (!campaign || !campaign.emailDetails) {
    throw new Error("Email campaign details were not found.")
  }

  if (campaign.emailDeliveries.length === 0) {
    throw new Error("This campaign has no failed emails to resend.")
  }

  const campaignInput = buildInputFromEmailDetail({
    detail: campaign.emailDetails,
    campaignName: campaign.name,
    utmCampaign: campaign.utmCampaign,
    baseUrl: input.baseUrl || campaign.emailDetails.baseUrl || "",
  })
  const context = await getMarketingEmailEventContext(campaignInput)
  const recipients = campaign.emailDeliveries.map((delivery) => ({
    id: delivery.id,
    name: delivery.recipientName || delivery.recipientEmail.split("@")[0] || "Guest",
    email: delivery.recipientEmail,
    discountCodes: parseStoredDiscountCodes(delivery.discountCodes, delivery.discountCode),
  }))
  const missingCodeRecipients = campaignInput.includeDiscountCodes
    ? recipients
        .filter((recipient) => recipient.discountCodes.length === 0)
        .map((recipient) => ({
          name: recipient.name,
          email: recipient.email,
          discountCount: 1,
        }))
    : []
  const generatedCodes = await createAssignedDiscountCodes(campaignInput, missingCodeRecipients)
  const sent: string[] = []
  const failed: Array<{ email: string; error: string }> = []
  const attemptedDeliveryIds: string[] = []

  for (const recipient of recipients) {
    const rendered = renderMarketingEmailForRecipient({
      campaign: campaignInput,
      context,
      recipient,
      discountCodes: recipient.discountCodes.length > 0 ? recipient.discountCodes : generatedCodes.get(recipient.email),
    })
    const attemptedAt = new Date()
    attemptedDeliveryIds.push(recipient.id)

    try {
      const delivery = await deliverMarketingEmail({
        campaignId: campaign.id,
        recipient,
        rendered,
        replyTo: campaignInput.replyTo,
        attachments: undefined,
        utmCampaign: campaign.utmCampaign,
      })

      await prisma.marketingEmailDelivery.update({
        where: {
          id: recipient.id,
        },
        data: {
          recipientName: recipient.name,
          subject: rendered.subject,
          targetUrl: rendered.targetUrl,
          discountCode: rendered.discountCode || null,
          discountCodes: rendered.discountCodes.length > 0 ? rendered.discountCodes : undefined,
          status: "SENT",
          attemptCount: {
            increment: 1,
          },
          lastAttemptAt: attemptedAt,
          sentAt: attemptedAt,
          errorMessage: null,
          providerMessageId: getProviderMessageId(delivery),
        },
      })
      sent.push(recipient.email)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email send failed."
      await prisma.marketingEmailDelivery.update({
        where: {
          id: recipient.id,
        },
        data: {
          subject: rendered.subject,
          targetUrl: rendered.targetUrl,
          discountCode: rendered.discountCode || null,
          discountCodes: rendered.discountCodes.length > 0 ? rendered.discountCodes : undefined,
          status: "FAILED",
          attemptCount: {
            increment: 1,
          },
          lastAttemptAt: attemptedAt,
          errorMessage: message,
        },
      })
      failed.push({
        email: recipient.email,
        error: message,
      })
    }
  }

  const status = failed.length > 0 && sent.length === 0 ? "FAILED" : "PUBLISHED"
  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: `${campaignInput.subject}\n\n${campaignInput.bodyTemplate}`,
    targetUrl: context.eventUrl,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    errorMessage: failed.length > 0 ? `${failed.length} email(s) failed on resend.` : null,
  })

  if (attemptedDeliveryIds.length > 0) {
    await prisma.marketingEmailDelivery.updateMany({
      where: {
        id: {
          in: attemptedDeliveryIds,
        },
      },
      data: {
        postId: post.id,
      },
    })
  }

  const remainingFailed = await prisma.marketingEmailDelivery.count({
    where: {
      campaignId: campaign.id,
      status: "FAILED",
    },
  })
  await updateCampaignStatusFromFailures(campaign.id, remainingFailed)

  return {
    campaignId: campaign.id,
    postId: post.id,
    total: recipients.length,
    sent: sent.length,
    failed: failed.length,
    generatedCodes: [...generatedCodes.values()].reduce((total, codes) => total + codes.length, 0),
  }
}

export async function resendMarketingEmailDelivery(input: {
  eventId: string
  campaignId: string
  deliveryId: string
  baseUrl: string
}) {
  const prisma = getMarketingPrismaClient()
  const campaign = await prisma.marketingCampaign.findFirst({
    where: {
      id: input.campaignId,
      eventId: input.eventId,
    },
    include: {
      emailDetails: true,
      emailDeliveries: {
        where: {
          id: input.deliveryId,
        },
        take: 1,
      },
    },
  })

  if (!campaign || !campaign.emailDetails) {
    throw new Error("Email campaign details were not found.")
  }

  const delivery = campaign.emailDeliveries[0]

  if (!delivery) {
    throw new Error("Email delivery row was not found.")
  }

  const campaignInput = buildInputFromEmailDetail({
    detail: campaign.emailDetails,
    campaignName: campaign.name,
    utmCampaign: campaign.utmCampaign,
    baseUrl: input.baseUrl || campaign.emailDetails.baseUrl || "",
  })
  const context = await getMarketingEmailEventContext(campaignInput)
  const recipient = {
    name: delivery.recipientName || delivery.recipientEmail.split("@")[0] || "Guest",
    email: delivery.recipientEmail,
    discountCount: 1,
  }
  const storedDiscountCodes = parseStoredDiscountCodes(delivery.discountCodes, delivery.discountCode)
  const generatedCodes = campaignInput.includeDiscountCodes && storedDiscountCodes.length === 0
    ? await createAssignedDiscountCodes(campaignInput, [recipient])
    : new Map<string, string[]>()
  const rendered = renderMarketingEmailForRecipient({
    campaign: campaignInput,
    context,
    recipient,
    discountCodes: storedDiscountCodes.length > 0 ? storedDiscountCodes : generatedCodes.get(recipient.email),
  })

  try {
    const providerDelivery = await deliverMarketingEmail({
      campaignId: campaign.id,
      recipient,
      rendered,
      replyTo: campaignInput.replyTo,
      attachments: undefined,
      utmCampaign: campaign.utmCampaign,
    })

    await updateEmailDeliveryAttempt({
      deliveryId: delivery.id,
      rendered,
      status: "SENT",
      providerMessageId: getProviderMessageId(providerDelivery),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed."
    await updateEmailDeliveryAttempt({
      deliveryId: delivery.id,
      rendered,
      status: "FAILED",
      errorMessage: message,
    })
    throw new Error(`Resend failed for ${recipient.email}: ${message}`)
  }

  const post = await recordMarketingPost({
    campaignId: campaign.id,
    platform: "EMAIL",
    caption: `${campaignInput.subject}\n\n${campaignInput.bodyTemplate}`,
    targetUrl: context.eventUrl,
    status: "PUBLISHED",
    publishedAt: new Date(),
    errorMessage: null,
  })
  await prisma.marketingEmailDelivery.update({
    where: {
      id: delivery.id,
    },
    data: {
      postId: post.id,
    },
  })

  const remainingFailed = await prisma.marketingEmailDelivery.count({
    where: {
      campaignId: campaign.id,
      status: "FAILED",
    },
  })
  await updateCampaignStatusFromFailures(campaign.id, remainingFailed)

  return {
    campaignId: campaign.id,
    postId: post.id,
    total: 1,
    sent: 1,
    failed: 0,
    generatedCodes: [...generatedCodes.values()].reduce((total, codes) => total + codes.length, 0),
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
