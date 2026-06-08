"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { CheckCircle2, Code2, Eye, FileText, Mail, Paperclip, Send, Sparkles, TicketPercent, Type, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type SendResult = {
  total: number
  sent: number
  failed: number
  generatedCodes: number
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
  "{{discountValue}}",
]

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

Thanks for being part of the TEEZ community. Here is your unique code for {{eventTitle}}:

{{discountCode}}

It gives you {{discountValue}} off and is locked to this email address for one redemption.

Use it here:
{{checkoutUrl}}`
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

function previewTemplate(value: string, event: EmailCampaignEvent) {
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
    discountValue: "20%",
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

export function AdminEventEmailCampaignComposer({ event }: { event: EmailCampaignEvent }) {
  const defaultCampaignName = `${slugify(event.title) || event.id}-email`
  const [campaignName, setCampaignName] = useState(defaultCampaignName)
  const [utmCampaign, setUtmCampaign] = useState(defaultCampaignName)
  const [recipientSource, setRecipientSource] = useState<RecipientSource>("EVENT_GUESTS")
  const [sourceEventId, setSourceEventId] = useState(event.id)
  const [pastedEmails, setPastedEmails] = useState("")
  const [subject, setSubject] = useState(`${event.title} details`)
  const [preheader, setPreheader] = useState(`Important details for ${event.title}.`)
  const [replyTo, setReplyTo] = useState("")
  const [ctaLabel, setCtaLabel] = useState("Open event")
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

  const pastedEmailCount = useMemo(() => countUniqueEmails(pastedEmails), [pastedEmails])
  const previewSubject = useMemo(() => previewTemplate(subject, event), [event, subject])
  const previewPreheader = useMemo(() => previewTemplate(preheader, event), [event, preheader])
  const previewBody = useMemo(() => previewTemplate(bodyTemplate, event), [bodyTemplate, event])
  const attachmentTotal = useMemo(() => attachments.reduce((total, attachment) => total + attachment.size, 0), [attachments])
  const recipientLabel =
    recipientSource === "EVENT_GUESTS"
      ? "paid guests from the selected event"
      : recipientSource === "PASTED_EMAILS"
        ? "the pasted email list"
        : "paid guests plus pasted emails"

  function applyEventDetailsPreset() {
    setIncludeDiscountCodes(false)
    setEmailFormat("BRANDED")
    setSubject(`${event.title} details`)
    setPreheader(`Date, time, venue, and event link for ${event.title}.`)
    setCtaLabel("Open event")
    setBodyTemplate(buildEventDetailsTemplate(event))
  }

  function applyDiscountPreset() {
    setIncludeDiscountCodes(true)
    setEmailFormat("BRANDED")
    setSubject("Your {{eventTitle}} discount code")
    setPreheader("Your private event discount code is inside.")
    setCtaLabel("Use code")
    setBodyTemplate(buildDiscountTemplate())
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
          emailFormat,
          bodyTemplate,
          attachments: attachments.map(({ filename, contentType, size, content }) => ({
            filename,
            contentType,
            size,
            content,
          })),
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
      })
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
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
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
              <div className="space-y-2">
                <Label htmlFor="email-source-event">Guest List Event ID</Label>
                <Input
                  id="email-source-event"
                  value={sourceEventId}
                  onChange={(inputEvent) => setSourceEventId(inputEvent.target.value)}
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => setSourceEventId(event.id)}>
                  Use this event
                </Button>
              </div>
            )}

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
            </div>

            {emailFormat === "BRANDED" && (
              <div className="space-y-2">
                <Label htmlFor="email-cta-label">CTA Label</Label>
                <Input id="email-cta-label" value={ctaLabel} onChange={(inputEvent) => setCtaLabel(inputEvent.target.value)} />
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
                Codes are created on this event and assigned to the recipient email, so checkout must use the same email address.
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
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              <Eye size={16} />
              Preview
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-background p-4">
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
                <div className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{previewBody}</div>
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
      </CardContent>
    </Card>
  )
}
