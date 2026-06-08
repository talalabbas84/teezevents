"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Link2,
  Mail,
  Megaphone,
  MessageCircle,
  Music2,
  Send,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type MarketingEvent = {
  id: string
  title: string
  startsAt: string | null
  venue: string | null
  address: string | null
  image: string | null
  previewDescription: string | null
  description: string | null
  checkoutEnabled: boolean
  ticketPriceCents: number
  currency: string
}

type PlatformId = "instagram" | "tiktok" | "facebook" | "x" | "linkedin" | "whatsapp" | "email"
type ApiPlatform = "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "X" | "LINKEDIN" | "WHATSAPP" | "EMAIL"

type IntegrationStatus = {
  platform: ApiPlatform
  label: string
  configured: boolean
  directPublish: boolean
  requiredEnv: string[]
  note: string
}

type PlatformPlan = {
  id: PlatformId
  apiPlatform: ApiPlatform
  label: string
  tone: string
  icon: typeof Megaphone
  supportsDirectShare: boolean
  caption: string
  shareUrl: string
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function formatEventDate(value: string | null) {
  if (!value) {
    return "date TBA"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "date TBA"
  }

  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatEventTime(value: string | null) {
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

function formatPrice(event: MarketingEvent) {
  if (event.ticketPriceCents <= 0) {
    return "free entry"
  }

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: event.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(event.ticketPriceCents / 100)
}

function buildCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell.replace(/"/g, '""')
          return /[",\n]/.test(value) ? `"${value}"` : value
        })
        .join(","),
    )
    .join("\n")
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  textarea.remove()
}

function buildTrackedUrl(baseUrl: string, source: string, campaign: string) {
  if (!/^https?:\/\//i.test(baseUrl)) {
    const separator = baseUrl.includes("?") ? "&" : "?"
    return `${baseUrl}${separator}utm_source=${encodeURIComponent(source)}&utm_medium=social&utm_campaign=${encodeURIComponent(campaign)}`
  }

  const url = new URL(baseUrl)
  url.searchParams.set("utm_source", source)
  url.searchParams.set("utm_medium", "social")
  url.searchParams.set("utm_campaign", campaign)
  return url.toString()
}

function buildPlatformPlans(event: MarketingEvent, campaign: string, destinationUrl: string): PlatformPlan[] {
  const date = formatEventDate(event.startsAt)
  const time = formatEventTime(event.startsAt)
  const venue = event.venue || event.address || "Toronto"
  const price = formatPrice(event)
  const shortDescription =
    event.previewDescription ||
    event.description ||
    `${event.title} is a TEEZ event with live tickets and limited capacity.`
  const ticketLine = event.checkoutEnabled ? `Tickets from ${price}.` : "RSVP details are on the event page."

  const plans = [
    {
      id: "instagram" as const,
      apiPlatform: "INSTAGRAM" as const,
      label: "Instagram",
      tone: "Feed, story, reel caption",
      icon: Instagram,
      supportsDirectShare: false,
      caption: `${event.title}\n${date}${time ? ` at ${time}` : ""}\n${venue}\n\n${shortDescription}\n\n${ticketLine}\n\n#teez #torontoevents #torontonightlife`,
    },
    {
      id: "tiktok" as const,
      apiPlatform: "TIKTOK" as const,
      label: "TikTok",
      tone: "Short caption",
      icon: Music2,
      supportsDirectShare: false,
      caption: `${event.title} is coming up in Toronto. ${date}${time ? ` at ${time}` : ""}. ${ticketLine} #torontoevents #teez`,
    },
    {
      id: "facebook" as const,
      apiPlatform: "FACEBOOK" as const,
      label: "Facebook",
      tone: "Event post",
      icon: Facebook,
      supportsDirectShare: true,
      caption: `${event.title} is happening ${date}${time ? ` at ${time}` : ""} at ${venue}.\n\n${shortDescription}\n\n${ticketLine}`,
    },
    {
      id: "x" as const,
      apiPlatform: "X" as const,
      label: "X",
      tone: "Short announcement",
      icon: Send,
      supportsDirectShare: true,
      caption: `${event.title} - ${date}${time ? `, ${time}` : ""} at ${venue}. ${ticketLine}`,
    },
    {
      id: "linkedin" as const,
      apiPlatform: "LINKEDIN" as const,
      label: "LinkedIn",
      tone: "Community post",
      icon: Linkedin,
      supportsDirectShare: true,
      caption: `${event.title} brings the TEEZ community together on ${date}${time ? ` at ${time}` : ""} at ${venue}.\n\n${shortDescription}\n\n${ticketLine}`,
    },
    {
      id: "whatsapp" as const,
      apiPlatform: "WHATSAPP" as const,
      label: "WhatsApp",
      tone: "Group message",
      icon: MessageCircle,
      supportsDirectShare: true,
      caption: `Hey, ${event.title} is happening ${date}${time ? ` at ${time}` : ""}. ${ticketLine}`,
    },
    {
      id: "email" as const,
      apiPlatform: "EMAIL" as const,
      label: "Email",
      tone: "Newsletter blurb",
      icon: Mail,
      supportsDirectShare: true,
      caption: `Subject: ${event.title}\n\n${event.title} is happening ${date}${time ? ` at ${time}` : ""} at ${venue}.\n\n${shortDescription}\n\n${ticketLine}`,
    },
  ]

  return plans.map((plan) => {
    const trackedUrl = buildTrackedUrl(destinationUrl, plan.id, campaign)
    const text = `${plan.caption}\n\n${trackedUrl}`
    const shareUrl =
      plan.id === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl)}`
        : plan.id === "x"
          ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(plan.caption)}&url=${encodeURIComponent(trackedUrl)}`
          : plan.id === "linkedin"
            ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(trackedUrl)}`
            : plan.id === "whatsapp"
              ? `https://wa.me/?text=${encodeURIComponent(text)}`
              : plan.id === "email"
                ? `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(text)}`
                : plan.id === "tiktok"
                  ? "https://www.tiktok.com/upload"
                  : "https://www.instagram.com/teez.events/"

    return {
      ...plan,
      caption: plan.caption,
      shareUrl,
    }
  })
}

export function AdminEventMarketingKit({ event }: { event: MarketingEvent }) {
  const [origin, setOrigin] = useState("")
  const [campaignName, setCampaignName] = useState(`${slugify(event.title)}-${new Date().getFullYear()}`)
  const [destination, setDestination] = useState<"event" | "checkout">(event.checkoutEnabled ? "checkout" : "event")
  const [objective, setObjective] = useState("Drive ticket sales")
  const [audience, setAudience] = useState("Toronto event-goers, past guests, and friends of guests")
  const [budgetCad, setBudgetCad] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [testRecipient, setTestRecipient] = useState("")
  const [emailSubject, setEmailSubject] = useState(`${event.title} is coming up`)
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [isRunningAction, setIsRunningAction] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState("")
  const [actionStatus, setActionStatus] = useState("")
  const [actionError, setActionError] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch("/api/admin/marketing/integrations")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.integrations)) {
          setIntegrations(payload.integrations)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIntegrations([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const baseUrl = `${origin || ""}${destination === "checkout" && event.checkoutEnabled ? `/checkout/${event.id}` : `/events/${event.id}`}`
  const campaign = slugify(campaignName) || slugify(event.title) || event.id
  const platformPlans = useMemo(() => buildPlatformPlans(event, campaign, baseUrl), [event, campaign, baseUrl])
  const primaryPlan = platformPlans.find((plan) => plan.id === "facebook") || platformPlans[0]
  const metaAdCopy = `${primaryPlan.caption}\n\nHeadline: ${event.title}\nDescription: ${formatEventDate(event.startsAt)}${event.venue ? ` at ${event.venue}` : ""}\nCTA: ${event.checkoutEnabled ? "Buy Tickets" : "Learn More"}`

  async function handleCopy(label: string, value: string) {
    await copyText(value)
    setCopiedLabel(label)
    window.setTimeout(() => setCopiedLabel(""), 1800)
  }

  function getIntegration(platform: ApiPlatform) {
    return integrations.find((integration) => integration.platform === platform)
  }

  async function runMarketingAction(input: {
    platform: ApiPlatform
    caption: string
    targetUrl: string
    emailMode?: "test" | "guests"
  }) {
    setActionError("")
    setActionStatus("")
    setIsRunningAction(true)

    const response = await fetch(`/api/admin/events/${encodeURIComponent(event.id)}/marketing/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: input.platform,
        campaignName,
        utmCampaign: campaign,
        caption: input.caption,
        targetUrl: input.targetUrl,
        mediaUrls: event.image ? [event.image] : [],
        objective,
        audience,
        budgetCents: budgetCad ? Math.round(Number(budgetCad) * 100) : undefined,
        scheduledAt: scheduledAt || undefined,
        emailSubject,
        testRecipient: input.emailMode === "test" ? testRecipient : undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsRunningAction(false)
      setActionError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)
    setIsRunningAction(false)

    if (!response.ok || payload?.ok === false) {
      setActionError(payload?.error || payload?.errorMessage || payload?.error || "Marketing action failed.")
      return
    }

    if (input.platform === "EMAIL") {
      setActionStatus(`Email campaign sent: ${payload.sent || 0} sent, ${payload.failed || 0} failed.`)
      return
    }

    if (payload.mode === "scheduled") {
      setActionStatus("Post saved as scheduled in the campaign log.")
      return
    }

    setActionStatus("Post published and logged to the campaign.")
  }

  function downloadCampaignCsv() {
    const rows = [
      ["platform", "campaign", "caption", "tracked_url", "share_url"],
      ...platformPlans.map((plan) => [
        plan.label,
        campaign,
        plan.caption,
        buildTrackedUrl(baseUrl, plan.id, campaign),
        plan.shareUrl,
      ]),
    ]
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${event.id}-marketing-campaign.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border border-border shadow-xl">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              <Megaphone size={16} />
              Marketing
            </div>
            <h2 className="mt-2 text-2xl font-serif font-bold">Promote this event</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Build tracked links, captions, and share-ready posts for each social channel.
            </p>
          </div>
          <Button type="button" variant="outline" className="border-primary text-primary" onClick={downloadCampaignCsv}>
            <span className="inline-flex items-center gap-2">
              <Download size={16} />
              Campaign CSV
            </span>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px_220px]">
          <div className="space-y-2">
            <Label htmlFor="marketing-campaign">Campaign Name</Label>
            <Input
              id="marketing-campaign"
              value={campaignName}
              onChange={(inputEvent) => setCampaignName(inputEvent.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketing-destination">Destination</Label>
            <select
              id="marketing-destination"
              value={destination}
              onChange={(inputEvent) => setDestination(inputEvent.target.value as "event" | "checkout")}
              className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="event">Event page</option>
              <option value="checkout" disabled={!event.checkoutEnabled}>
                Checkout page
              </option>
            </select>
          </div>
          <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Link2 size={15} className="text-primary" />
              Landing URL
            </div>
            <button
              type="button"
              className="mt-2 max-w-full truncate text-left text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => void handleCopy("Landing URL", baseUrl)}
            >
              {baseUrl || `/events/${event.id}`}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="marketing-objective">Objective</Label>
            <Input
              id="marketing-objective"
              value={objective}
              onChange={(inputEvent) => setObjective(inputEvent.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketing-budget">Budget CAD</Label>
            <Input
              id="marketing-budget"
              type="number"
              min={0}
              step="0.01"
              value={budgetCad}
              onChange={(inputEvent) => setBudgetCad(inputEvent.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="marketing-schedule">Schedule At</Label>
            <Input
              id="marketing-schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(inputEvent) => setScheduledAt(inputEvent.target.value)}
            />
          </div>
          <div className="space-y-2 lg:col-span-4">
            <Label htmlFor="marketing-audience">Audience</Label>
            <Input
              id="marketing-audience"
              value={audience}
              onChange={(inputEvent) => setAudience(inputEvent.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {integrations.map((integration) => (
            <div key={integration.platform} className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{integration.label}</div>
                <Badge variant={integration.configured ? "secondary" : "outline"}>
                  {integration.configured ? "Connected" : "Setup needed"}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{integration.note}</div>
              {!integration.configured && (
                <div className="mt-2 text-xs text-muted-foreground">{integration.requiredEnv.join(", ")}</div>
              )}
            </div>
          ))}
        </div>

        {copiedLabel && (
          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-sm text-primary">
            {`${copiedLabel} copied.`}
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        )}
        {actionStatus && (
          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-sm text-primary">
            {actionStatus}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {platformPlans.map((plan) => {
            const Icon = plan.icon
            const trackedUrl = buildTrackedUrl(baseUrl, plan.id, campaign)
            const integration = getIntegration(plan.apiPlatform)
            const canDirectPublish = Boolean(integration?.configured && integration.directPublish && plan.apiPlatform !== "EMAIL")

            return (
              <div key={plan.id} className="rounded-3xl border border-border bg-muted/20 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold">{plan.label}</div>
                      <div className="text-xs text-muted-foreground">{plan.tone}</div>
                    </div>
                  </div>
                  <Badge variant={plan.supportsDirectShare ? "secondary" : "outline"}>
                    {canDirectPublish ? "Connected" : plan.supportsDirectShare ? "Share link" : "Copy first"}
                  </Badge>
                </div>

                <Textarea value={plan.caption} readOnly rows={6} className="bg-background" />
                <div className="mt-3 rounded-2xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <div className="truncate">{trackedUrl}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary"
                    onClick={() => void handleCopy(`${plan.label} caption`, `${plan.caption}\n\n${trackedUrl}`)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Copy size={14} />
                      Copy
                    </span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary"
                    onClick={() => void handleCopy(`${plan.label} link`, trackedUrl)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Link2 size={14} />
                      Link
                    </span>
                  </Button>
                  <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-accent">
                    <a href={plan.shareUrl} target="_blank" rel="noreferrer">
                      <span className="inline-flex items-center gap-2">
                        <ExternalLink size={14} />
                        Open
                      </span>
                    </a>
                  </Button>
                  {plan.apiPlatform !== "EMAIL" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary"
                      onClick={() =>
                        void runMarketingAction({
                          platform: plan.apiPlatform,
                          caption: plan.caption,
                          targetUrl: trackedUrl,
                        })
                      }
                      disabled={isRunningAction || !canDirectPublish}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Megaphone size={14} />
                        {scheduledAt ? "Schedule" : "Publish"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-3xl border border-border bg-muted/20 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <Mail size={16} />
                Email Campaign
              </div>
              <h3 className="mt-2 text-xl font-serif font-bold">Send from TEEZ to paid guests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Uses your configured email provider and logs the send under this campaign.
              </p>
            </div>
            <Badge variant={getIntegration("EMAIL")?.configured ? "secondary" : "outline"}>
              {getIntegration("EMAIL")?.configured ? "Email connected" : "Email setup needed"}
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="space-y-2">
              <Label htmlFor="marketing-email-subject">Subject</Label>
              <Input
                id="marketing-email-subject"
                value={emailSubject}
                onChange={(inputEvent) => setEmailSubject(inputEvent.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marketing-test-recipient">Test Recipient</Label>
              <Input
                id="marketing-test-recipient"
                type="email"
                value={testRecipient}
                onChange={(inputEvent) => setTestRecipient(inputEvent.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary text-primary"
              onClick={() => {
                if (!testRecipient.trim()) {
                  setActionError("Add a test recipient email first.")
                  return
                }

                const emailPlan = platformPlans.find((plan) => plan.id === "email") || primaryPlan
                void runMarketingAction({
                  platform: "EMAIL",
                  caption: emailPlan.caption,
                  targetUrl: buildTrackedUrl(baseUrl, "email", campaign),
                  emailMode: "test",
                })
              }}
              disabled={isRunningAction || !getIntegration("EMAIL")?.configured}
            >
              Send Test Email
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-accent"
              onClick={() => {
                const confirmed = window.confirm("Send this marketing email to all paid guest emails for this event?")

                if (!confirmed) {
                  return
                }

                const emailPlan = platformPlans.find((plan) => plan.id === "email") || primaryPlan
                void runMarketingAction({
                  platform: "EMAIL",
                  caption: emailPlan.caption,
                  targetUrl: buildTrackedUrl(baseUrl, "email", campaign),
                  emailMode: "guests",
                })
              }}
              disabled={isRunningAction || !getIntegration("EMAIL")?.configured}
            >
              Send to Paid Guests
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            <Label htmlFor="marketing-ad-copy">Paid Ad Copy</Label>
            <Textarea id="marketing-ad-copy" value={metaAdCopy} readOnly rows={7} className="bg-background" />
          </div>
          <div className="rounded-3xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
            <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              <Megaphone size={16} className="text-primary" />
              Ad Manager Checklist
            </div>
            <div className="space-y-2">
              <div>Use the tracked URL for the matching platform.</div>
              <div>Use a 4:5 creative for feed and 9:16 for story/reel/TikTok.</div>
              <div>{event.image ? "Hero image is available for creative." : "Upload a hero image in Event Studio first."}</div>
              <div>Recommended CTA: {event.checkoutEnabled ? "Buy Tickets" : "Learn More"}</div>
              <div>Scheduled posts publish through <code>/api/admin/marketing/process-scheduled</code>.</div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full border-primary text-primary"
              onClick={() => void handleCopy("Paid ad copy", metaAdCopy)}
            >
              <span className="inline-flex items-center gap-2">
                <Copy size={14} />
                Copy Ad Copy
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
