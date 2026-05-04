"use client"

import { useState } from "react"
import { Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"

type BulkEmailResponse = {
  ok?: boolean
  total?: number
  sent?: number
  skipped?: number
  failed?: number
  error?: string
}

export function AdminEventEmailActions({
  eventId,
  emailEnabled,
}: {
  eventId: string
  emailEnabled: boolean
}) {
  const [status, setStatus] = useState("")
  const [isSending, setIsSending] = useState(false)

  async function sendBulkEmails(skipIfAlreadySent: boolean) {
    const confirmed = window.confirm(
      skipIfAlreadySent
        ? "Email tickets to paid orders that have not been emailed yet?"
        : "Email tickets to every paid order for this event, including orders that were already emailed?",
    )

    if (!confirmed) {
      return
    }

    setStatus("")
    setIsSending(true)

    const response = await fetch(`/api/admin/events/${eventId}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        skipIfAlreadySent,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSending(false)
      setStatus("Network error.")
      return
    }

    const payload = (await response.json().catch(() => null)) as BulkEmailResponse | null

    setIsSending(false)

    if (!response.ok || !payload?.ok) {
      setStatus(payload?.error || "Unable to send ticket emails.")
      return
    }

    setStatus(`${payload.sent || 0} sent, ${payload.skipped || 0} skipped, ${payload.failed || 0} failed.`)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-primary text-primary"
          disabled={!emailEnabled || isSending}
          onClick={() => void sendBulkEmails(true)}
        >
          <span className="inline-flex items-center gap-1">
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Email Unsent
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-primary text-primary"
          disabled={!emailEnabled || isSending}
          onClick={() => void sendBulkEmails(false)}
        >
          Email All
        </Button>
      </div>
      {!emailEnabled && <div className="text-xs text-muted-foreground">SMTP not configured</div>}
      {status && <div className="text-xs text-muted-foreground">{status}</div>}
    </div>
  )
}
