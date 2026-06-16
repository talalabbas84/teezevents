"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Code2,
  Copy,
  Eye,
  FileText,
  History,
  LayoutTemplate,
  Link2,
  Mail,
  Monitor,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TicketPercent,
  Type,
  Users,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type EmailCampaignEvent = {
  id: string
  title: string
  startsAt: string | null
  venue: string | null
  address: string | null
  checkoutEnabled: boolean
  currency: string
}

type RecipientSource = "EVENT_GUESTS" | "PASTED_EMAILS" | "BOTH"
type DiscountType = "PERCENT" | "FIXED"
type EmailFormat = "BRANDED" | "CUSTOM_HTML"
type CtaDestination = "EVENT_PAGE" | "CHECKOUT" | "CUSTOM"
type PreviewMode = "DESKTOP" | "MOBILE"

type AudienceEvent = {
  id: string
  title: string
  startsAt: string | null
  venue: string | null
  address: string | null
  paidOrders: number
  ticketsIssued: number
  uniqueRecipients: number
  revenueCents: number
}

type SendResult = {
  total: number
  sent: number
  failed: number
  generatedCodes: number
  campaignId?: string
}

type CampaignHistoryDelivery = {
  id: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  targetUrl: string | null
  discountCode: string | null
  discountCodes: string[]
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"
  attemptCount: number
  lastAttemptAt: string | null
  sentAt: string | null
  errorMessage: string | null
  providerMessageId: string | null
  createdAt: string
  updatedAt: string
}

type CampaignHistoryItem = {
  id: string
  name: string
  utmCampaign: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED"
  audience: string | null
  objective: string | null
  createdAt: string
  updatedAt: string
  post: {
    id: string
    status: "DRAFT" | "READY" | "PUBLISHED" | "FAILED"
    caption: string
    targetUrl: string
    errorMessage: string | null
    publishedAt: string | null
    createdAt: string
  } | null
  detail: {
    sourceEventId: string | null
    recipientSource: string
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
    discountType: DiscountType | null
    amountValue: number | null
    expiresAt: string | null
    baseUrl: string | null
    attachmentNames: unknown
  } | null
  total: number
  sent: number
  failed: number
  deliveries: CampaignHistoryDelivery[]
}

type CampaignAttachment = {
  id: string
  filename: string
  contentType: string
  size: number
  content: string
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const maxAttachmentSize = 5 * 1024 * 1024
const maxTotalAttachmentSize = 15 * 1024 * 1024
const maxAttachments = 5
const templateVariables = [
  "{{firstName}}",
  "{{name}}",
  "{{email}}",
  "{{eventTitle}}",
  "{{eventDate}}",
  "{{eventTime}}",
  "{{venue}}",
  "{{eventUrl}}",
  "{{checkoutUrl}}",
  "{{discountCode}}",
  "{{discountCodes}}",
  "{{discountCodeCount}}",
  "{{discountValue}}",
  "{{sourceEventTitle}}",
  "{{sourceEventDate}}",
  "{{sourceEventVenue}}",
]

const contentBlocks = [
  { id: "headline", label: "Headline", icon: Type },
  { id: "event-details", label: "Event Details", icon: ClipboardList },
  { id: "past-guest", label: "Past Guest", icon: Users },
  { id: "discount", label: "Discount", icon: TicketPercent },
  { id: "cta", label: "CTA", icon: Link2 },
  { id: "divider", label: "Divider", icon: LayoutTemplate },
] as const

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function countUniqueEmails(value: string) {
  return [...new Set((value.match(emailPattern) || []).map(normalizeEmail))].length
}

function toDateLabel(value: string | null) {
  if (!value) {
    return "Date to be announced"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced"
  }

  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function toTimeLabel(value: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function toShortDateLabel(value: string | null) {
  if (!value) {
    return "TBA"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "TBA"
  }

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(amountInCents: number, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amountInCents / 100)
}

function formatDateTimeLabel(value: string | null) {
  if (!value) {
    return "Not recorded"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not recorded"
  }

  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getFailedDeliveries(campaign: CampaignHistoryItem) {
  return campaign.deliveries.filter((delivery) => delivery.status === "FAILED")
}

function getInferredFailureCount(campaign: CampaignHistoryItem) {
  const match = campaign.post?.errorMessage?.match(/(\d+)\s+email/i)
  return match ? Number(match[1]) : null
}

function hasCampaignLevelFailure(campaign: CampaignHistoryItem) {
  return Boolean(campaign.post?.errorMessage || campaign.post?.status === "FAILED")
}

function getDeliveryBadgeVariant(status: CampaignHistoryDelivery["status"]) {
  if (status === "FAILED") {
    return "destructive" as const
  }

  if (status === "SENT") {
    return "secondary" as const
  }

  return "outline" as const
}

function getDeliveryStatusLabel(status: CampaignHistoryDelivery["status"]) {
  switch (status) {
    case "SENT":
      return "Sent"
    case "FAILED":
      return "Failed"
    case "PENDING":
      return "Pending"
    case "SKIPPED":
      return "Skipped"
  }
}

function buildEventDetailsTemplate(event: EmailCampaignEvent) {
  const venue = event.venue || event.address || "Venue to be announced"

  return `Hi {{firstName}},

Here are the details for {{eventTitle}}:

Date: {{eventDate}}
Time: {{eventTime}}
Venue: ${venue}

Open the event page:
{{eventUrl}}`
}

function buildDiscountTemplate() {
  return `Hi {{firstName}},

Thanks for being part of the TEEZ community. Based on your previous ticket purchase, here are your unique code(s) for {{eventTitle}}:

{{discountCodes}}

Each code gives you {{discountValue}} off, is locked to this email address, and can be used once.

Use your first code here:
{{checkoutUrl}}`
}

function buildReminderTemplate(event: EmailCampaignEvent) {
  const venue = event.venue || event.address || "Venue to be announced"

  return `Hi {{firstName}},

{{eventTitle}} is coming up soon, and we wanted to make sure you have the key details ready.

Date: {{eventDate}}
Time: {{eventTime}}
Venue: ${venue}

Open your event page:
{{eventUrl}}`
}

function buildLastCallTemplate() {
  return `Hi {{firstName}},

We are opening a final window for {{eventTitle}}.

If you were at {{sourceEventTitle}}, this is a good follow-up night for the same community. Spots are limited, and the current event page has the latest ticket availability.

Reserve here:
{{checkoutUrl}}`
}

function buildPastGuestTemplate() {
  return `Hi {{firstName}},

Thank you for joining us at {{sourceEventTitle}}.

We would love to see you again at {{eventTitle}}:

Date: {{eventDate}}
Time: {{eventTime}}
Venue: {{venue}}

Open the invite:
{{eventUrl}}`
}

function buildCustomHtmlTemplate() {
  return `<div style="font-family: Arial, sans-serif; color: #25211d; line-height: 1.6;">
  <h1>{{eventTitle}}</h1>
  <p>Hi {{firstName}},</p>
  <p>We are sending an update for {{eventTitle}}.</p>
  <p><strong>Date:</strong> {{eventDate}}<br>
  <strong>Time:</strong> {{eventTime}}<br>
  <strong>Venue:</strong> {{venue}}</p>
  <p><a href="{{eventUrl}}">Open event page</a></p>
</div>`
}

function buildContentBlock(blockId: (typeof contentBlocks)[number]["id"], format: EmailFormat) {
  if (format === "CUSTOM_HTML") {
    const htmlBlocks: Record<(typeof contentBlocks)[number]["id"], string> = {
      headline: `<h2 style="font-size: 28px; line-height: 1.2; margin: 28px 0 12px;">{{eventTitle}}</h2>`,
      "event-details": `<table role="presentation" style="width:100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td style="padding: 6px 0; font-weight: 700;">Date</td><td style="padding: 6px 0;">{{eventDate}}</td></tr>
  <tr><td style="padding: 6px 0; font-weight: 700;">Time</td><td style="padding: 6px 0;">{{eventTime}}</td></tr>
  <tr><td style="padding: 6px 0; font-weight: 700;">Venue</td><td style="padding: 6px 0;">{{venue}}</td></tr>
</table>`,
      "past-guest": `<p style="margin: 18px 0;">Thanks for being part of {{sourceEventTitle}}. We are inviting that attendee list first for {{eventTitle}}.</p>`,
      discount: `<p style="margin: 18px 0;"><strong>Your code(s):</strong><br>{{discountCodes}}<br><strong>Value:</strong> {{discountValue}}</p>`,
      cta: `<p style="margin: 28px 0;"><a href="{{checkoutUrl}}" style="display:inline-block; background:#c57a3a; color:#fffaf2; padding:14px 20px; border-radius:999px; text-decoration:none; font-weight:700;">Reserve now</a></p>`,
      divider: `<hr style="border:0; border-top:1px solid #e8d7c1; margin: 28px 0;">`,
    }

    return htmlBlocks[blockId]
  }

  const textBlocks: Record<(typeof contentBlocks)[number]["id"], string> = {
    headline: `{{eventTitle}}`,
    "event-details": `Date: {{eventDate}}
Time: {{eventTime}}
Venue: {{venue}}`,
    "past-guest": `Thanks for being part of {{sourceEventTitle}}. We are inviting that attendee list first for {{eventTitle}}.`,
    discount: `Your code(s):
{{discountCodes}}
Value: {{discountValue}}`,
    cta: `Reserve here:
{{checkoutUrl}}`,
    divider: `---`,
  }

  return textBlocks[blockId]
}

function previewTemplate(value: string, event: EmailCampaignEvent, sourceEvent?: AudienceEvent) {
  const replacements: Record<string, string> = {
    firstName: "Alex",
    name: "Alex Guest",
    email: "alex@example.com",
    eventTitle: event.title,
    eventDate: toDateLabel(event.startsAt),
    eventTime: toTimeLabel(event.startsAt),
    venue: event.venue || event.address || "Venue to be announced",
    eventUrl: `/events/${event.id}`,
    checkoutUrl: `/checkout/${event.id}?voucher=TEEZ-SAMPLE123`,
    discountCode: "TEEZ-SAMPLE123",
    discountCodes: "1. TEEZ-SAMPLE123\n2. TEEZ-SAMPLE456\n3. TEEZ-SAMPLE789",
    discountCodeCount: "3",
    discountValue: "20%",
    sourceEventTitle: sourceEvent?.title || event.title,
    sourceEventDate: toDateLabel(sourceEvent?.startsAt || event.startsAt),
    sourceEventVenue: sourceEvent?.venue || sourceEvent?.address || event.venue || event.address || "Venue to be announced",
  }

  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => replacements[key] ?? "")
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function makeAttachmentId(filename: string) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${filename}-${suffix}`
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      resolve(result.split(",")[1] || "")
    }
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export function AdminEventEmailCampaignComposer({
  event,
  audienceEvents = [],
  campaignHistory = [],
}: {
  event: EmailCampaignEvent
  audienceEvents?: AudienceEvent[]
  campaignHistory?: CampaignHistoryItem[]
}) {
  const defaultCampaignName = `${slugify(event.title) || event.id}-email`
  const audienceOptions = useMemo(() => {
    const hasCurrentEvent = audienceEvents.some((audienceEvent) => audienceEvent.id === event.id)

    return hasCurrentEvent
      ? audienceEvents
      : [
          {
            id: event.id,
            title: event.title,
            startsAt: event.startsAt,
            venue: event.venue,
            address: event.address,
            paidOrders: 0,
            ticketsIssued: 0,
            uniqueRecipients: 0,
            revenueCents: 0,
          },
          ...audienceEvents,
        ]
  }, [audienceEvents, event])
  const [campaignName, setCampaignName] = useState(defaultCampaignName)
  const [utmCampaign, setUtmCampaign] = useState(defaultCampaignName)
  const [recipientSource, setRecipientSource] = useState<RecipientSource>("EVENT_GUESTS")
  const [sourceEventId, setSourceEventId] = useState(event.id)
  const [excludeCurrentEventGuests, setExcludeCurrentEventGuests] = useState(false)
  const [pastedEmails, setPastedEmails] = useState("")
  const [subject, setSubject] = useState(`${event.title} details`)
  const [preheader, setPreheader] = useState(`Important details for ${event.title}.`)
  const [replyTo, setReplyTo] = useState("")
  const [ctaLabel, setCtaLabel] = useState("Open event")
  const [ctaDestination, setCtaDestination] = useState<CtaDestination>("EVENT_PAGE")
  const [customCtaUrl, setCustomCtaUrl] = useState("")
  const [emailFormat, setEmailFormat] = useState<EmailFormat>("BRANDED")
  const [bodyTemplate, setBodyTemplate] = useState(buildEventDetailsTemplate(event))
  const [testRecipient, setTestRecipient] = useState("")
  const [attachments, setAttachments] = useState<CampaignAttachment[]>([])
  const [includeDiscountCodes, setIncludeDiscountCodes] = useState(false)
  const [codePrefix, setCodePrefix] = useState("TEEZ")
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENT")
  const [amountValue, setAmountValue] = useState("20")
  const [expiresAt, setExpiresAt] = useState("")
  const [loadingMode, setLoadingMode] = useState<"test" | "campaign" | null>(null)
  const [error, setError] = useState("")
  const [result, setResult] = useState<SendResult | null>(null)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("DESKTOP")
  const [history, setHistory] = useState<CampaignHistoryItem[]>(campaignHistory)
  const [historyError, setHistoryError] = useState("")
  const [historyActionId, setHistoryActionId] = useState<string | null>(null)

  const selectedAudienceEvent = useMemo(
    () => audienceOptions.find((audienceEvent) => audienceEvent.id === sourceEventId) || audienceOptions[0],
    [audienceOptions, sourceEventId],
  )
  const pastedEmailCount = useMemo(() => countUniqueEmails(pastedEmails), [pastedEmails])
  const previewSubject = useMemo(() => previewTemplate(subject, event, selectedAudienceEvent), [event, selectedAudienceEvent, subject])
  const previewPreheader = useMemo(() => previewTemplate(preheader, event, selectedAudienceEvent), [event, preheader, selectedAudienceEvent])
  const previewBody = useMemo(() => previewTemplate(bodyTemplate, event, selectedAudienceEvent), [bodyTemplate, event, selectedAudienceEvent])
  const attachmentTotal = useMemo(() => attachments.reduce((total, attachment) => total + attachment.size, 0), [attachments])
  const selectedEventRecipientCount =
    selectedAudienceEvent && excludeCurrentEventGuests && selectedAudienceEvent.id === event.id ? 0 : selectedAudienceEvent?.uniqueRecipients || 0
  const estimatedRecipientCount =
    recipientSource === "EVENT_GUESTS"
      ? selectedEventRecipientCount
      : recipientSource === "PASTED_EMAILS"
        ? pastedEmailCount
        : selectedEventRecipientCount + pastedEmailCount
  const selectedAudienceLabel = selectedAudienceEvent?.title || sourceEventId
  const recipientLabel =
    recipientSource === "EVENT_GUESTS"
      ? `paid attendees from ${selectedAudienceLabel}`
      : recipientSource === "PASTED_EMAILS"
        ? "the pasted email list"
        : `${selectedAudienceLabel} attendees plus pasted emails`
  const ctaUrlTemplate =
    ctaDestination === "EVENT_PAGE" ? "{{eventUrl}}" : ctaDestination === "CHECKOUT" ? "{{checkoutUrl}}" : customCtaUrl
  const previewCtaUrl = previewTemplate(ctaUrlTemplate, event, selectedAudienceEvent)
  const qualityChecks = [
    {
      label: "Subject length",
      passed: previewSubject.length >= 8 && previewSubject.length <= 78,
      detail: `${previewSubject.length} characters`,
    },
    {
      label: "Preheader",
      passed: previewPreheader.length >= 20 && previewPreheader.length <= 140,
      detail: previewPreheader ? `${previewPreheader.length} characters` : "Missing",
    },
    {
      label: "Audience",
      passed: estimatedRecipientCount > 0 || Boolean(testRecipient.trim()),
      detail: `${estimatedRecipientCount} estimated recipient(s)`,
    },
    {
      label: "CTA",
      passed: emailFormat === "CUSTOM_HTML" || Boolean(ctaLabel.trim() && ctaUrlTemplate.trim()),
      detail: emailFormat === "CUSTOM_HTML" ? "Managed in HTML" : ctaDestination.toLowerCase().replace("_", " "),
    },
    {
      label: "Attachments",
      passed: attachmentTotal <= maxTotalAttachmentSize,
      detail: `${attachments.length} file(s)`,
    },
  ]

  function applyEventDetailsPreset() {
    setIncludeDiscountCodes(false)
    setEmailFormat("BRANDED")
    setSubject(`${event.title} details`)
    setPreheader(`Date, time, venue, and event link for ${event.title}.`)
    setCtaLabel("Open event")
    setCtaDestination("EVENT_PAGE")
    setBodyTemplate(buildEventDetailsTemplate(event))
  }

  function applyDiscountPreset() {
    setIncludeDiscountCodes(true)
    setEmailFormat("BRANDED")
    setSubject("Your {{eventTitle}} discount code")
    setPreheader("Your private event discount code is inside.")
    setCtaLabel("Use code")
    setCtaDestination("CHECKOUT")
    setBodyTemplate(buildDiscountTemplate())
  }

  function applyReminderPreset() {
    setIncludeDiscountCodes(false)
    setEmailFormat("BRANDED")
    setSubject("Reminder: {{eventTitle}}")
    setPreheader("Everything you need before arrival.")
    setCtaLabel("View details")
    setCtaDestination("EVENT_PAGE")
    setBodyTemplate(buildReminderTemplate(event))
  }

  function applyLastCallPreset() {
    setIncludeDiscountCodes(false)
    setEmailFormat("BRANDED")
    setSubject("Final call for {{eventTitle}}")
    setPreheader("A limited number of spots are still available.")
    setCtaLabel("Reserve now")
    setCtaDestination("CHECKOUT")
    setBodyTemplate(buildLastCallTemplate())
  }

  function applyPastGuestPreset() {
    setIncludeDiscountCodes(false)
    setEmailFormat("BRANDED")
    setSubject("An invite for {{sourceEventTitle}} guests")
    setPreheader("You are on the early invite list for our next TEEZ event.")
    setCtaLabel("Open invite")
    setCtaDestination("EVENT_PAGE")
    setBodyTemplate(buildPastGuestTemplate())
  }

  function applyHtmlPreset() {
    setEmailFormat("CUSTOM_HTML")
    setSubject(`${event.title} update`)
    setPreheader(`A new update for ${event.title}.`)
    setBodyTemplate(buildCustomHtmlTemplate())
  }

  function appendVariable(variable: string) {
    setBodyTemplate((current) => `${current}${current.endsWith("\n") ? "" : "\n"}${variable}`)
  }

  function appendContentBlock(blockId: (typeof contentBlocks)[number]["id"]) {
    const block = buildContentBlock(blockId, emailFormat)

    setBodyTemplate((current) => `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n\n"}${block}`)
  }

  async function copyTemplate() {
    if (!navigator.clipboard) {
      setError("Clipboard access is not available in this browser.")
      return
    }

    await navigator.clipboard.writeText(bodyTemplate)
    setError("")
  }

  async function handleAttachmentChange(inputEvent: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(inputEvent.target.files || [])
    inputEvent.target.value = ""

    if (files.length === 0) {
      return
    }

    if (attachments.length + files.length > maxAttachments) {
      setError(`Attach up to ${maxAttachments} files per campaign.`)
      return
    }

    const oversized = files.find((file) => file.size > maxAttachmentSize)

    if (oversized) {
      setError(`${oversized.name} is over the ${formatBytes(maxAttachmentSize)} file limit.`)
      return
    }

    const nextTotal = attachmentTotal + files.reduce((total, file) => total + file.size, 0)

    if (nextTotal > maxTotalAttachmentSize) {
      setError(`Attachments can total up to ${formatBytes(maxTotalAttachmentSize)} per campaign.`)
      return
    }

    try {
      const nextAttachments = await Promise.all(
        files.map(async (file) => ({
          id: makeAttachmentId(file.name),
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          content: await readFileAsBase64(file),
        })),
      )

      setAttachments((current) => [...current, ...nextAttachments])
      setError("")
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : "Unable to attach file.")
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id))
  }

  async function refreshCampaignHistory() {
    const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/marketing/email-campaign`)
    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to load campaign history.")
    }

    setHistory(payload.campaigns || [])
  }

  function loadCampaignIntoEditor(campaign: CampaignHistoryItem, mode: "template" | "failed-list") {
    if (!campaign.detail) {
      setHistoryError("This campaign does not have a saved template snapshot.")
      return
    }

    const detail = campaign.detail
    const failedEmails = getFailedDeliveries(campaign).map((delivery) => delivery.recipientEmail)
    const ctaUrl = detail.ctaUrl || ""
    const nextRecipientSource: RecipientSource =
      detail.recipientSource === "PASTED_EMAILS" || detail.recipientSource === "BOTH" ? detail.recipientSource : "EVENT_GUESTS"
    const nextEmailFormat: EmailFormat = detail.emailFormat === "CUSTOM_HTML" ? "CUSTOM_HTML" : "BRANDED"

    setCampaignName(mode === "failed-list" ? `${campaign.name}-failed-resend` : campaign.name)
    setUtmCampaign(campaign.utmCampaign)
    setRecipientSource(mode === "failed-list" ? "PASTED_EMAILS" : nextRecipientSource)
    setSourceEventId(detail.sourceEventId || event.id)
    setExcludeCurrentEventGuests(detail.excludeCurrentEventGuests)
    setPastedEmails(mode === "failed-list" ? failedEmails.join("\n") : "")
    setSubject(detail.subject)
    setPreheader(detail.preheader || "")
    setReplyTo(detail.replyTo || "")
    setCtaLabel(detail.ctaLabel || "Open event")
    setCtaDestination(ctaUrl === "{{checkoutUrl}}" ? "CHECKOUT" : ctaUrl === "{{eventUrl}}" || !ctaUrl ? "EVENT_PAGE" : "CUSTOM")
    setCustomCtaUrl(ctaUrl === "{{checkoutUrl}}" || ctaUrl === "{{eventUrl}}" ? "" : ctaUrl)
    setEmailFormat(nextEmailFormat)
    setBodyTemplate(detail.bodyTemplate)
    setIncludeDiscountCodes(detail.includeDiscountCodes)
    setCodePrefix(detail.codePrefix || "TEEZ")
    setDiscountType(detail.discountType || "PERCENT")
    setAmountValue(typeof detail.amountValue === "number" ? String(detail.amountValue) : "20")
    setExpiresAt(detail.expiresAt ? detail.expiresAt.slice(0, 16) : "")
    setAttachments([])
    setError("")
    setHistoryError(
      mode === "failed-list"
        ? "Failed recipients loaded into the pasted list. Edit any addresses, then send as a new campaign."
        : "Campaign template loaded. Attachments are not stored in history, so reattach files before resending if needed.",
    )
  }

  async function resendFailedCampaign(campaign: CampaignHistoryItem) {
    const failedDeliveries = getFailedDeliveries(campaign)

    if (failedDeliveries.length === 0) {
      setHistoryError("This campaign has no failed emails to resend.")
      return
    }

    const confirmed = window.confirm(`Resend this campaign to ${failedDeliveries.length} failed recipient(s)?`)

    if (!confirmed) {
      return
    }

    setHistoryActionId(campaign.id)
    setHistoryError("")

    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/marketing/email-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resend_failed",
          campaignId: campaign.id,
          baseUrl: window.location.origin,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to resend failed emails.")
      }

      setResult({
        total: payload.total || 0,
        sent: payload.sent || 0,
        failed: payload.failed || 0,
        generatedCodes: payload.generatedCodes || 0,
        campaignId: payload.campaignId,
      })
      await refreshCampaignHistory()
    } catch (resendError) {
      setHistoryError(resendError instanceof Error ? resendError.message : "Unable to resend failed emails.")
    } finally {
      setHistoryActionId(null)
    }
  }

  async function resendSingleDelivery(campaign: CampaignHistoryItem, delivery: CampaignHistoryDelivery) {
    if (!campaign.detail) {
      setHistoryError("This campaign does not have a saved template snapshot.")
      return
    }

    const confirmed = window.confirm(`Resend this campaign email to ${delivery.recipientEmail}?`)

    if (!confirmed) {
      return
    }

    const actionId = `delivery:${delivery.id}`
    setHistoryActionId(actionId)
    setHistoryError("")

    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/marketing/email-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resend_delivery",
          campaignId: campaign.id,
          deliveryId: delivery.id,
          baseUrl: window.location.origin,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to resend email.")
      }

      setResult({
        total: payload.total || 0,
        sent: payload.sent || 0,
        failed: payload.failed || 0,
        generatedCodes: payload.generatedCodes || 0,
        campaignId: payload.campaignId,
      })
      await refreshCampaignHistory()
    } catch (resendError) {
      setHistoryError(resendError instanceof Error ? resendError.message : "Unable to resend email.")
    } finally {
      setHistoryActionId(null)
    }
  }

  async function sendEmailCampaign(mode: "test" | "campaign") {
    setError("")
    setResult(null)

    if (mode === "test" && !testRecipient.trim()) {
      setError("Add a test recipient before sending a test email.")
      return
    }

    if (!subject.trim() || !bodyTemplate.trim()) {
      setError("Subject and message are required.")
      return
    }

    if (emailFormat === "BRANDED" && !ctaLabel.trim()) {
      setError("Add a CTA label for the branded email template.")
      return
    }

    if ((recipientSource === "EVENT_GUESTS" || recipientSource === "BOTH") && !sourceEventId.trim()) {
      setError("Select the event audience for this campaign.")
      return
    }

    if (emailFormat === "BRANDED" && ctaDestination === "CUSTOM" && !customCtaUrl.trim()) {
      setError("Add a custom CTA URL or choose event page or checkout.")
      return
    }

    if (includeDiscountCodes) {
      const amount = Number(amountValue)

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Discount amount must be above 0.")
        return
      }

      if (discountType === "PERCENT" && amount > 100) {
        setError("Percent discount cannot be above 100.")
        return
      }
    }

    if (mode === "campaign") {
      const confirmed = window.confirm(`Send this campaign to ${recipientLabel}?`)

      if (!confirmed) {
        return
      }
    }

    setLoadingMode(mode)

    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/marketing/email-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientSource,
          sourceEventId,
          pastedEmails,
          testRecipient: mode === "test" ? testRecipient : undefined,
          campaignName,
          utmCampaign,
          subject,
          preheader,
          replyTo,
          ctaLabel,
          ctaUrl: ctaUrlTemplate,
          emailFormat,
          bodyTemplate,
          attachments: attachments.map(({ filename, contentType, size, content }) => ({
            filename,
            contentType,
            size,
            content,
          })),
          excludeCurrentEventGuests,
          audienceLabel: selectedAudienceLabel,
          includeDiscountCodes,
          codePrefix,
          discountType,
          amountValue: Number(amountValue),
          expiresAt,
          baseUrl: window.location.origin,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send email campaign.")
      }

      setResult({
        total: payload.total || 0,
        sent: payload.sent || 0,
        failed: payload.failed || 0,
        generatedCodes: payload.generatedCodes || 0,
        campaignId: payload.campaignId,
      })
      await refreshCampaignHistory()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send email campaign.")
    } finally {
      setLoadingMode(null)
    }
  }

  return (
    <Card className="border border-border shadow-xl">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              <Mail size={16} />
              Enterprise Email
            </div>
            <h2 className="mt-2 text-2xl font-serif font-bold">Mass email builder</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Build branded or custom HTML campaigns, send test emails, attach files, and deliver to guest segments or pasted lists.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyEventDetailsPreset}>
              <span className="inline-flex items-center gap-2">
                <Sparkles size={16} />
                Event Details
              </span>
            </Button>
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyDiscountPreset}>
              <span className="inline-flex items-center gap-2">
                <TicketPercent size={16} />
                Discount Codes
              </span>
            </Button>
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyReminderPreset}>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} />
                Reminder
              </span>
            </Button>
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyLastCallPreset}>
              <span className="inline-flex items-center gap-2">
                <Target size={16} />
                Last Call
              </span>
            </Button>
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyPastGuestPreset}>
              <span className="inline-flex items-center gap-2">
                <Users size={16} />
                Past Guests
              </span>
            </Button>
            <Button type="button" variant="outline" className="border-primary text-primary" onClick={applyHtmlPreset}>
              <span className="inline-flex items-center gap-2">
                <Code2 size={16} />
                HTML
              </span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="email-campaign-name">Campaign Name</Label>
            <Input id="email-campaign-name" value={campaignName} onChange={(inputEvent) => setCampaignName(inputEvent.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-utm-campaign">UTM Campaign</Label>
            <Input id="email-utm-campaign" value={utmCampaign} onChange={(inputEvent) => setUtmCampaign(inputEvent.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-test-recipient">Test Recipient</Label>
            <Input
              id="email-test-recipient"
              type="email"
              value={testRecipient}
              onChange={(inputEvent) => setTestRecipient(inputEvent.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-reply-to">Reply-To</Label>
            <Input
              id="email-reply-to"
              type="email"
              value={replyTo}
              onChange={(inputEvent) => setReplyTo(inputEvent.target.value)}
              placeholder="events@example.com"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="email-preheader">Preheader</Label>
            <Input
              id="email-preheader"
              value={preheader}
              onChange={(inputEvent) => setPreheader(inputEvent.target.value)}
              placeholder="Short inbox preview text"
            />
            <div className="text-xs text-muted-foreground">{`${previewPreheader.length} characters`}</div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Audience</div>
              <Badge variant="outline">{`${estimatedRecipientCount} est.`}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-recipient-source">Recipients</Label>
              <select
                id="email-recipient-source"
                value={recipientSource}
                onChange={(inputEvent) => setRecipientSource(inputEvent.target.value as RecipientSource)}
                className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="EVENT_GUESTS">Paid guests from event</option>
                <option value="PASTED_EMAILS">Pasted emails or CSV</option>
                <option value="BOTH">Event guests and pasted list</option>
              </select>
            </div>

            {(recipientSource === "EVENT_GUESTS" || recipientSource === "BOTH") && (
              <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-3">
                <div className="space-y-2">
                  <Label htmlFor="email-source-event">Attendee Source Event</Label>
                  <select
                    id="email-source-event"
                    value={sourceEventId}
                    onChange={(inputEvent) => setSourceEventId(inputEvent.target.value)}
                    className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {audienceOptions.map((audienceEvent) => (
                      <option key={audienceEvent.id} value={audienceEvent.id}>
                        {`${audienceEvent.title} - ${toShortDateLabel(audienceEvent.startsAt)} - ${audienceEvent.uniqueRecipients} recipients`}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAudienceEvent && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-border bg-muted/20 p-2">
                      <div className="text-muted-foreground">Recipients</div>
                      <div className="mt-1 text-lg font-serif font-bold">{selectedAudienceEvent.uniqueRecipients}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-2">
                      <div className="text-muted-foreground">Orders</div>
                      <div className="mt-1 text-lg font-serif font-bold">{selectedAudienceEvent.paidOrders}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-2">
                      <div className="text-muted-foreground">Tickets</div>
                      <div className="mt-1 text-lg font-serif font-bold">{selectedAudienceEvent.ticketsIssued}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-2">
                      <div className="text-muted-foreground">Revenue</div>
                      <div className="mt-1 text-lg font-serif font-bold">{formatCurrency(selectedAudienceEvent.revenueCents, event.currency)}</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSourceEventId(event.id)}>
                    Use this event
                  </Button>
                  {audienceOptions.find((audienceEvent) => audienceEvent.id !== event.id && audienceEvent.uniqueRecipients > 0) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const previousEvent = audienceOptions.find((audienceEvent) => audienceEvent.id !== event.id && audienceEvent.uniqueRecipients > 0)

                        if (previousEvent) {
                          setSourceEventId(previousEvent.id)
                          setExcludeCurrentEventGuests(true)
                        }
                      }}
                    >
                      Use latest previous
                    </Button>
                  )}
                </div>

                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  <span>
                    <span className="block text-sm font-medium">Exclude current-event attendees</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Removes emails that already bought or hold tickets for this event.</span>
                  </span>
                  <Switch checked={excludeCurrentEventGuests} onCheckedChange={setExcludeCurrentEventGuests} />
                </label>
              </div>
            )}

            {(recipientSource === "PASTED_EMAILS" || recipientSource === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="email-pasted-list">Pasted Emails or CSV</Label>
                <Textarea
                  id="email-pasted-list"
                  value={pastedEmails}
                  onChange={(inputEvent) => setPastedEmails(inputEvent.target.value)}
                  rows={8}
                  placeholder="Paste emails, ticket exports, or orders CSV rows."
                />
                <div className="text-xs text-muted-foreground">{`${pastedEmailCount} unique pasted email(s) detected.`}</div>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Builder</div>
              <div className="flex rounded-md border border-border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={emailFormat === "BRANDED" ? "default" : "ghost"}
                  onClick={() => setEmailFormat("BRANDED")}
                >
                  <span className="inline-flex items-center gap-1">
                    <Type size={14} />
                    Branded
                  </span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={emailFormat === "CUSTOM_HTML" ? "default" : "ghost"}
                  onClick={() => setEmailFormat("CUSTOM_HTML")}
                >
                  <span className="inline-flex items-center gap-1">
                    <Code2 size={14} />
                    HTML
                  </span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={subject} onChange={(inputEvent) => setSubject(inputEvent.target.value)} />
              <div className="text-xs text-muted-foreground">{`${previewSubject.length} characters`}</div>
            </div>

            {emailFormat === "BRANDED" && (
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="space-y-2">
                  <Label htmlFor="email-cta-label">CTA Label</Label>
                  <Input id="email-cta-label" value={ctaLabel} onChange={(inputEvent) => setCtaLabel(inputEvent.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-cta-destination">CTA Destination</Label>
                  <select
                    id="email-cta-destination"
                    value={ctaDestination}
                    onChange={(inputEvent) => setCtaDestination(inputEvent.target.value as CtaDestination)}
                    className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="EVENT_PAGE">Event page</option>
                    <option value="CHECKOUT">Checkout</option>
                    <option value="CUSTOM">Custom URL</option>
                  </select>
                </div>
                {ctaDestination === "CUSTOM" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email-custom-cta-url">Custom CTA URL</Label>
                    <Input
                      id="email-custom-cta-url"
                      value={customCtaUrl}
                      onChange={(inputEvent) => setCustomCtaUrl(inputEvent.target.value)}
                      placeholder="https://example.com/campaign-link"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email-body-template">{emailFormat === "CUSTOM_HTML" ? "HTML Template" : "Message Template"}</Label>
              <Textarea
                id="email-body-template"
                value={bodyTemplate}
                onChange={(inputEvent) => setBodyTemplate(inputEvent.target.value)}
                rows={emailFormat === "CUSTOM_HTML" ? 16 : 12}
                className={emailFormat === "CUSTOM_HTML" ? "font-mono text-sm" : undefined}
              />
              <div className="text-xs text-muted-foreground">{`${bodyTemplate.length} of 40,000 characters`}</div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LayoutTemplate size={16} className="text-primary" />
                  Content Blocks
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => void copyTemplate()}>
                  <span className="inline-flex items-center gap-2">
                    <Copy size={14} />
                    Copy
                  </span>
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {contentBlocks.map((block) => {
                  const Icon = block.icon

                  return (
                    <Button key={block.id} type="button" size="sm" variant="outline" onClick={() => appendContentBlock(block.id)}>
                      <span className="inline-flex items-center gap-2">
                        <Icon size={14} />
                        {block.label}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {templateVariables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="rounded-full border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  onClick={() => appendVariable(variable)}
                >
                  {variable}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Paperclip size={16} className="text-primary" />
                    Attachments
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {`${attachments.length}/${maxAttachments} files, ${formatBytes(attachmentTotal)} of ${formatBytes(maxTotalAttachmentSize)} used.`}
                  </div>
                </div>
                <Input type="file" multiple onChange={handleAttachmentChange} className="max-w-xs" />
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{attachment.filename}</div>
                        <div className="text-xs text-muted-foreground">{`${attachment.contentType} - ${formatBytes(attachment.size)}`}</div>
                      </div>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.filename}`}>
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={includeDiscountCodes}
              onChange={(inputEvent) => setIncludeDiscountCodes(inputEvent.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block font-semibold">Generate unique one-use discount code per recipient</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Codes are created on this event and assigned to the recipient email. Paid guest audiences receive one code per
                ticket purchased by that email on the source event.
              </span>
            </span>
          </label>

          {includeDiscountCodes && (
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="email-code-prefix">Code Prefix</Label>
                <Input id="email-code-prefix" value={codePrefix} onChange={(inputEvent) => setCodePrefix(inputEvent.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-discount-type">Discount Type</Label>
                <select
                  id="email-discount-type"
                  value={discountType}
                  onChange={(inputEvent) => setDiscountType(inputEvent.target.value as DiscountType)}
                  className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="PERCENT">Percent off</option>
                  <option value="FIXED">Fixed CAD off</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-discount-amount">{discountType === "PERCENT" ? "Percent Off" : "CAD Off"}</Label>
                <Input
                  id="email-discount-amount"
                  type="number"
                  min={discountType === "PERCENT" ? 1 : 0.01}
                  max={discountType === "PERCENT" ? 100 : undefined}
                  step={discountType === "PERCENT" ? 1 : 0.01}
                  value={amountValue}
                  onChange={(inputEvent) => setAmountValue(inputEvent.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-discount-expiry">Expires At</Label>
                <Input
                  id="email-discount-expiry"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(inputEvent) => setExpiresAt(inputEvent.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <Eye size={16} />
                Preview
              </div>
              <div className="flex rounded-md border border-border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "DESKTOP" ? "default" : "ghost"}
                  onClick={() => setPreviewMode("DESKTOP")}
                  aria-label="Desktop preview"
                >
                  <Monitor size={14} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "MOBILE" ? "default" : "ghost"}
                  onClick={() => setPreviewMode("MOBILE")}
                  aria-label="Mobile preview"
                >
                  <Smartphone size={14} />
                </Button>
              </div>
            </div>
            <div
              className={`mt-3 rounded-2xl border border-border bg-background p-4 transition-all ${
                previewMode === "MOBILE" ? "mx-auto max-w-[390px]" : "w-full"
              }`}
            >
              <div className="text-lg font-semibold">{previewSubject}</div>
              {previewPreheader && <div className="mt-1 text-sm text-muted-foreground">{previewPreheader}</div>}
              {emailFormat === "CUSTOM_HTML" ? (
                <iframe
                  title="Email HTML preview"
                  sandbox=""
                  srcDoc={previewBody}
                  className="mt-4 h-80 w-full rounded-xl border border-border bg-white"
                />
              ) : (
                <div className="mt-4 rounded-2xl border border-border bg-[#fffaf2] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Teez Events Co.</div>
                  <div className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{previewBody}</div>
                  <div className="mt-5">
                    <span className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      {ctaLabel || "Open event"}
                    </span>
                  </div>
                  <div className="mt-2 break-all text-xs text-muted-foreground">{previewCtaUrl}</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <FileText size={16} />
              Send Controls
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              The campaign will send to {recipientLabel}. Test sends include the current subject, body, reply-to, and attachments.
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={16} className="text-primary" />
                Campaign Checks
              </div>
              <div className="space-y-2">
                {qualityChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium">{check.label}</div>
                      <div className="text-xs text-muted-foreground">{check.detail}</div>
                    </div>
                    <Badge variant={check.passed ? "secondary" : "outline"}>{check.passed ? "Ready" : "Review"}</Badge>
                  </div>
                ))}
              </div>
            </div>
            {error && <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {result && (
              <div className="mt-4 rounded-xl border border-primary/15 bg-primary/10 p-3 text-sm text-primary">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} />
                  {`${result.sent} of ${result.total} email(s) sent.`}
                </div>
                <div className="mt-1">{`${result.generatedCodes} discount code(s) generated. ${result.failed} failed.`}</div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-primary text-primary"
                disabled={loadingMode !== null}
                onClick={() => void sendEmailCampaign("test")}
              >
                {loadingMode === "test" ? "Sending Test..." : "Send Test"}
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-foreground hover:bg-accent"
                disabled={loadingMode !== null}
                onClick={() => void sendEmailCampaign("campaign")}
              >
                <span className="inline-flex items-center gap-2">
                  <Send size={16} />
                  {loadingMode === "campaign" ? "Sending..." : "Send Campaign"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <History size={16} />
                Campaign History
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Review sent campaigns, inspect failed recipients, resend failures, or load a saved template back into the builder.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-primary text-primary"
              disabled={historyActionId !== null}
              onClick={() => {
                setHistoryActionId("refresh")
                setHistoryError("")
                refreshCampaignHistory()
                  .catch((refreshError) =>
                    setHistoryError(refreshError instanceof Error ? refreshError.message : "Unable to refresh campaign history."),
                  )
                  .finally(() => setHistoryActionId(null))
              }}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={16} className={historyActionId === "refresh" ? "animate-spin" : undefined} />
                Refresh
              </span>
            </Button>
          </div>

          {historyError && (
            <div className="mt-4 rounded-xl border border-primary/15 bg-primary/10 p-3 text-sm text-primary">{historyError}</div>
          )}

          {history.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              No email campaigns have been sent for this event yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {history.map((campaign) => {
                const failedDeliveries = getFailedDeliveries(campaign)
                const hasRecipientLogs = campaign.deliveries.length > 0
                const campaignLevelFailure = hasCampaignLevelFailure(campaign)
                const inferredFailureCount = getInferredFailureCount(campaign)
                const statusLabel = hasRecipientLogs
                  ? campaign.failed > 0
                    ? `${campaign.failed} failed`
                    : "All sent"
                  : campaignLevelFailure
                    ? "Untracked failure"
                    : "No recipient logs"

                return (
                  <details
                    key={campaign.id}
                    className="rounded-2xl border border-border bg-background/80 p-4"
                    open={campaign.failed > 0 || (!hasRecipientLogs && campaignLevelFailure)}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="break-words text-lg font-serif font-bold">{campaign.name}</h3>
                            <Badge
                              variant={
                                hasRecipientLogs && campaign.failed === 0
                                  ? "secondary"
                                  : campaignLevelFailure || campaign.failed > 0
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {statusLabel}
                            </Badge>
                            <Badge variant="outline">{campaign.status}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {hasRecipientLogs
                              ? `${campaign.sent}/${campaign.total} sent - ${formatDateTimeLabel(campaign.createdAt)}`
                              : `Recipient-level statuses unavailable - ${formatDateTimeLabel(campaign.createdAt)}`}
                          </div>
                          {campaign.detail && (
                            <div className="mt-2 break-words text-sm font-medium">{campaign.detail.subject}</div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                            <div className="font-serif text-xl font-bold">{hasRecipientLogs ? campaign.total : "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                            <div className="font-serif text-xl font-bold">{hasRecipientLogs ? campaign.sent : "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">Sent</div>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                            <div className="font-serif text-xl font-bold">
                              {hasRecipientLogs ? campaign.failed : inferredFailureCount ?? "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                          </div>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      {!hasRecipientLogs && campaignLevelFailure && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                          <div className="flex items-center gap-2 font-semibold">
                            <AlertTriangle size={16} />
                            Recipient statuses were not captured for this send.
                          </div>
                          <p className="mt-2 leading-relaxed">
                            {`The campaign only has a campaign-level error: ${
                              campaign.post?.errorMessage || "Email delivery failed."
                            } Exact failed email addresses are unavailable for this older/untracked send. Load the template and send again to create per-email status rows.`}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          disabled={!campaign.detail}
                          onClick={() => loadCampaignIntoEditor(campaign, "template")}
                        >
                          Load Template
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          disabled={failedDeliveries.length === 0 || !campaign.detail}
                          onClick={() => loadCampaignIntoEditor(campaign, "failed-list")}
                        >
                          Use Failed List
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-accent"
                          disabled={failedDeliveries.length === 0 || !campaign.detail || historyActionId !== null}
                          onClick={() => void resendFailedCampaign(campaign)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <RefreshCw size={14} className={historyActionId === campaign.id ? "animate-spin" : undefined} />
                            {historyActionId === campaign.id ? "Resending..." : "Resend Failed"}
                          </span>
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                          <div className="font-semibold">Campaign Details</div>
                          <div className="mt-2 space-y-1 text-muted-foreground">
                            <div>{`Audience: ${campaign.audience || campaign.detail?.audienceLabel || "Not recorded"}`}</div>
                            <div>{`UTM: ${campaign.utmCampaign}`}</div>
                            <div>{`Last update: ${formatDateTimeLabel(campaign.updatedAt)}`}</div>
                            {campaign.detail?.attachmentNames ? (
                              <div>Attachments were used. Reattach files before sending from the builder.</div>
                            ) : null}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                          <div className="font-semibold">Latest Error</div>
                          <div className="mt-2 text-muted-foreground">
                            {failedDeliveries[0]?.errorMessage ||
                              campaign.post?.errorMessage ||
                              (hasRecipientLogs ? "No delivery errors recorded." : "No recipient-level delivery records found.")}
                          </div>
                        </div>
                      </div>

                      {hasRecipientLogs && (
                        <div className="rounded-xl border border-border bg-muted/20 p-3">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Mail size={16} className="text-primary" />
                              All Recipient Statuses
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {`${campaign.deliveries.filter((delivery) => delivery.status === "SENT").length} sent`}
                              </Badge>
                              <Badge variant={failedDeliveries.length > 0 ? "destructive" : "outline"}>
                                {`${failedDeliveries.length} failed`}
                              </Badge>
                              <Badge variant="outline">
                                {`${campaign.deliveries.filter((delivery) => delivery.status === "PENDING").length} pending`}
                              </Badge>
                              <Badge variant="outline">
                                {`${campaign.deliveries.filter((delivery) => delivery.status === "SKIPPED").length} skipped`}
                              </Badge>
                            </div>
                          </div>
                          <div className="max-h-72 space-y-2 overflow-auto pr-1">
                            {campaign.deliveries.map((delivery) => (
                              <div key={delivery.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="break-all font-medium">{delivery.recipientEmail}</div>
                                    {delivery.recipientName && (
                                      <div className="text-xs text-muted-foreground">{delivery.recipientName}</div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={getDeliveryBadgeVariant(delivery.status)}>
                                      {getDeliveryStatusLabel(delivery.status)}
                                    </Badge>
                                    <Badge variant="outline">{`${delivery.attemptCount} attempt${delivery.attemptCount === 1 ? "" : "s"}`}</Badge>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 border-primary text-primary"
                                      disabled={!campaign.detail || historyActionId !== null}
                                      onClick={() => void resendSingleDelivery(campaign, delivery)}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <RefreshCw
                                          size={13}
                                          className={historyActionId === `delivery:${delivery.id}` ? "animate-spin" : undefined}
                                        />
                                        {historyActionId === `delivery:${delivery.id}` ? "Resending" : "Resend"}
                                      </span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-2 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                                  <div>{`Subject: ${delivery.subject}`}</div>
                                  <div>{`Last attempt: ${formatDateTimeLabel(delivery.lastAttemptAt)}`}</div>
                                  <div>{`Sent at: ${formatDateTimeLabel(delivery.sentAt)}`}</div>
                                  <div>{`Provider ID: ${delivery.providerMessageId || "Not returned"}`}</div>
                                </div>
                                {delivery.discountCodes.length > 0 && (
                                  <div className="mt-2 rounded-lg border border-primary/15 bg-primary/5 p-2 text-xs">
                                    <div className="font-semibold text-primary">
                                      {`${delivery.discountCodes.length} assigned discount code${
                                        delivery.discountCodes.length === 1 ? "" : "s"
                                      }`}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {delivery.discountCodes.map((code) => (
                                        <span key={code} className="rounded-md border border-border bg-background px-2 py-1 font-mono">
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {delivery.targetUrl && <div className="mt-2 break-all text-xs text-muted-foreground">{delivery.targetUrl}</div>}
                                {delivery.errorMessage && (
                                  <div className="mt-2 rounded-lg border border-destructive/15 bg-destructive/5 p-2 text-destructive">
                                    {delivery.errorMessage}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
