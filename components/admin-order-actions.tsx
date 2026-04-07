"use client"

import type { FormEvent } from "react"

import { useState } from "react"
import { Download, Loader2, Mail, Pencil, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AdminOrderActions({
  orderId,
  accessToken,
  defaultEmail,
  emailEnabled,
  customerName,
  customerPhone,
  notes,
  internalLabel,
  quantity,
  source,
  ticketTierName,
  voucherCode,
  totalLabel,
}: {
  orderId: string
  accessToken: string | null
  defaultEmail: string
  emailEnabled: boolean
  customerName: string
  customerPhone: string | null
  notes: string | null
  internalLabel: string | null
  quantity: number
  source: "CHECKOUT" | "ADMIN_COMP"
  ticketTierName: string | null
  voucherCode: string | null
  totalLabel: string
}) {
  const [status, setStatus] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editName, setEditName] = useState(customerName)
  const [editEmail, setEditEmail] = useState(defaultEmail)
  const [editPhone, setEditPhone] = useState(customerPhone || "")
  const [editNotes, setEditNotes] = useState(notes || "")
  const [editInternalLabel, setEditInternalLabel] = useState(internalLabel || "")
  const [editQuantity, setEditQuantity] = useState(String(quantity))

  async function handleEmailClick() {
    const recipientEmail = window.prompt("Send tickets to which email?", defaultEmail)

    if (!recipientEmail) {
      return
    }

    setStatus("")
    setIsSending(true)

    const response = await fetch(`/api/admin/orders/${orderId}/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSending(false)
      setStatus("Network error.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setIsSending(false)
      setStatus(payload?.error || "Unable to email tickets.")
      return
    }

    setIsSending(false)
    setStatus(`Sent to ${payload.recipientEmail}`)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("")
    setIsSaving(true)

    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: editName,
        customerEmail: editEmail,
        customerPhone: editPhone || undefined,
        notes: editNotes || undefined,
        internalLabel: editInternalLabel || undefined,
        quantity: source === "ADMIN_COMP" ? Math.max(1, Number(editQuantity) || 1) : undefined,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSaving(false)
      setStatus("Network error.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.ok) {
      setIsSaving(false)
      setStatus(payload?.error || "Unable to save order.")
      return
    }

    setStatus("Order updated. Reloading dashboard...")
    setIsDialogOpen(false)
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {accessToken && (
          <Button asChild size="sm" variant="outline" className="border-primary text-primary">
            <a href={`/tickets/${accessToken}`}>
              <span className="inline-flex items-center gap-1">
                <Ticket size={14} />
                Wallet
              </span>
            </a>
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-primary text-primary">
              <span className="inline-flex items-center gap-1">
                <Pencil size={14} />
                Edit
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
              <DialogDescription>
                Correct buyer details, internal labeling, and admin notes. Quantity can only be changed for complimentary/admin-issued orders.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`order-name-${orderId}`}>Buyer name</Label>
                  <Input
                    id={`order-name-${orderId}`}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`order-email-${orderId}`}>Buyer email</Label>
                  <Input
                    id={`order-email-${orderId}`}
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`order-phone-${orderId}`}>Phone</Label>
                  <Input
                    id={`order-phone-${orderId}`}
                    value={editPhone}
                    onChange={(event) => setEditPhone(event.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`order-qty-${orderId}`}>Quantity</Label>
                  <Input
                    id={`order-qty-${orderId}`}
                    type="number"
                    min={1}
                    value={editQuantity}
                    onChange={(event) => setEditQuantity(event.target.value)}
                    disabled={isSaving || source !== "ADMIN_COMP"}
                  />
                  {source !== "ADMIN_COMP" && (
                    <p className="text-xs text-muted-foreground">Paid checkout orders keep their original quantity.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`order-label-${orderId}`}>Internal label</Label>
                  <Input
                    id={`order-label-${orderId}`}
                    value={editInternalLabel}
                    onChange={(event) => setEditInternalLabel(event.target.value)}
                    placeholder="Performer, VIP, sponsor, etc."
                    disabled={isSaving}
                  />
                </div>
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <div>{ticketTierName ? `Tier: ${ticketTierName}` : "Standard checkout pricing"}</div>
                  <div className="mt-1">{voucherCode ? `Voucher: ${voucherCode}` : "No voucher applied"}</div>
                  <div className="mt-1">{`Total: ${totalLabel}`}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`order-notes-${orderId}`}>Admin notes</Label>
                <Textarea
                  id={`order-notes-${orderId}`}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={4}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                  Close
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-accent" disabled={isSaving}>
                  <span className="inline-flex items-center gap-2">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                    Save Changes
                  </span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <Button asChild size="sm" variant="outline" className="border-primary text-primary">
          <a href={`/api/admin/orders/${orderId}/download`}>
            <span className="inline-flex items-center gap-1">
              <Download size={14} />
              Download
            </span>
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-accent"
          disabled={isSending || !emailEnabled}
          onClick={() => void handleEmailClick()}
        >
          <span className="inline-flex items-center gap-1">
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Email
          </span>
        </Button>
      </div>
      {!emailEnabled && <div className="text-xs text-muted-foreground">SMTP not configured</div>}
      {status && <div className="max-w-[220px] text-right text-xs text-muted-foreground">{status}</div>}
    </div>
  )
}
