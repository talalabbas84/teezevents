"use client"

import type { FormEvent } from "react"

import { useState } from "react"
import { Download, Loader2, TicketPercent } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function getFilenameFromDisposition(value: string | null) {
  const match = value?.match(/filename="([^"]+)"/)
  return match?.[1] || "guest-discount-codes.csv"
}

function countEmails(value: string) {
  return new Set((value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) => email.toLowerCase())).size
}

export function AdminDiscountCodeGenerator({ eventId }: { eventId: string }) {
  const [emails, setEmails] = useState("")
  const [campaignName, setCampaignName] = useState("Blossom guest discount")
  const [codePrefix, setCodePrefix] = useState("BLOSSOM")
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT")
  const [amountValue, setAmountValue] = useState("20")
  const [expiresAt, setExpiresAt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setStatus("")
    setIsGenerating(true)

    const response = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/discount-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails,
        campaignName,
        codePrefix,
        discountType,
        amountValue: Number(amountValue) || 0,
        expiresAt: expiresAt || undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsGenerating(false)
      setError("Network error. Please try again.")
      return
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      setIsGenerating(false)
      setError(payload?.error || "Unable to generate discount codes.")
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = getFilenameFromDisposition(response.headers.get("Content-Disposition"))
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setIsGenerating(false)
    setStatus(`Generated ${countEmails(emails)} unique one-use code(s).`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="discount-campaign">Campaign</Label>
          <Input
            id="discount-campaign"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount-prefix">Code Prefix</Label>
          <Input
            id="discount-prefix"
            value={codePrefix}
            onChange={(event) => setCodePrefix(event.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount-type">Discount Type</Label>
          <select
            id="discount-type"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as "PERCENT" | "FIXED")}
            className="w-full rounded-md border-2 border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isGenerating}
          >
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed CAD off</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount-amount">{discountType === "PERCENT" ? "Percent Off" : "CAD Off"}</Label>
          <Input
            id="discount-amount"
            type="number"
            min={discountType === "PERCENT" ? 1 : 0}
            max={discountType === "PERCENT" ? 100 : undefined}
            step={discountType === "PERCENT" ? 1 : 0.01}
            value={amountValue}
            onChange={(event) => setAmountValue(event.target.value)}
            disabled={isGenerating}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="discount-expiry">Expires At</Label>
        <Input
          id="discount-expiry"
          type="datetime-local"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          disabled={isGenerating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="discount-emails">Guest Emails</Label>
        <Textarea
          id="discount-emails"
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder="Paste emails, a CSV export, or one email per line."
          rows={8}
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground">
          {`${countEmails(emails)} unique email(s) detected. Each code is limited to one redemption and must be used with the matching checkout email.`}
        </p>
      </div>

      {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {status && <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm text-primary">{status}</div>}

      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-accent" disabled={isGenerating}>
        <span className="inline-flex items-center gap-2">
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Generate CSV
        </span>
      </Button>

      <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
          <TicketPercent size={16} className="text-primary" />
          Future-event discount codes
        </div>
        The CSV includes email, unique code, event id, discount value, expiry, and a checkout link with the code attached.
      </div>
    </form>
  )
}
