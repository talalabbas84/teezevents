"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Mail, Send, Sparkles, TicketPercent } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

type SendResult = {
  total: number
  sent: number
  failed: number
  generatedCodes: number
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
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

export function AdminEventEmailCampaignComposer({ event }: { event: EmailCampaignEvent }) {
  const defaultCampaignName = `${slugify(event.title) || event.id}-email`
  const [campaignName, setCampaignName] = useState(defaultCampaignName)
  const [utmCampaign, setUtmCampaign] = useState(defaultCampaignName)
  const [recipientSource, setRecipientSource] = useState<RecipientSource>("EVENT_GUESTS")
  const [sourceEventId, setSourceEventId] = useState(event.id)
  const [pastedEmails, setPastedEmails] = useState("")
  const [subject, setSubject] = useState(`${event.title} details`)
  const [bodyTemplate, setBodyTemplate] = useState(buildEventDetailsTemplate(event))
  const [testRecipient, setTestRecipient] = useState("")
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
  const previewBody = useMemo(() => previewTemplate(bodyTemplate, event), [bodyTemplate, event])
  const recipientLabel =
    recipientSource === "EVENT_GUESTS"
      ? "paid guests from the selected event"
      : recipientSource === "PASTED_EMAILS"
        ? "the pasted email list"
        : "paid guests plus pasted emails"

  function applyEventDetailsPreset() {
    setIncludeDiscountCodes(false)
    setSubject(`${event.title} details`)
    setBodyTemplate(buildEventDetailsTemplate(event))
  }

  function applyDiscountPreset() {
    setIncludeDiscountCodes(true)
    setSubject("Your {{eventTitle}} discount code")
    setBodyTemplate(buildDiscountTemplate())
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
          bodyTemplate,
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
              Email Campaigns
            </div>
            <h2 className="mt-2 text-2xl font-serif font-bold">Send event emails and discount codes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Email current attendees, paste a CSV list, or issue one-use discount codes while sending the message.
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
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
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
                rows={7}
                placeholder="Paste emails, ticket exports, or orders CSV rows."
              />
              <div className="text-xs text-muted-foreground">{`${pastedEmailCount} unique pasted email(s) detected.`}</div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={subject} onChange={(inputEvent) => setSubject(inputEvent.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body-template">Message Template</Label>
              <Textarea
                id="email-body-template"
                value={bodyTemplate}
                onChange={(inputEvent) => setBodyTemplate(inputEvent.target.value)}
                rows={12}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {templateVariables.map((variable) => (
                <Badge key={variable} variant="outline" className="font-mono">
                  {variable}
                </Badge>
              ))}
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Preview</div>
            <div className="mt-3 text-lg font-semibold">{previewSubject}</div>
            <div className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{previewBody}</div>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Send Controls</div>
            <div className="mt-3 text-sm text-muted-foreground">
              The campaign will send to {recipientLabel}. Use test send first when changing templates or discount settings.
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
