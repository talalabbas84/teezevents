"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { createNewEvent, type CreateEventState } from "@/actions/events-create"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── Submit Button ────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base font-semibold"
    >
      {pending ? "Creating Event…" : "Create Event & Open Planning"}
    </Button>
  )
}

// ─── Field Error ──────────────────────────────────────────────────────────────

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="mt-1 text-xs text-destructive">{errors[0]}</p>
}

// ─── Native select styled to match Shadcn inputs ─────────────────────────────

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const datetimeCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

// ─── New Event Form ───────────────────────────────────────────────────────────

export function NewEventForm() {
  const [state, action] = useActionState<CreateEventState, FormData>(
    createNewEvent,
    null
  )

  const fe = state?.fieldErrors ?? {}

  return (
    <form action={action} className="space-y-6">
      {/* General error banner */}
      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* ── Card 1: Basic Information ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 1
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold">Basic Information</h2>
          </div>
          <Separator />

          {/* Event ID */}
          <div className="space-y-1.5">
            <Label htmlFor="id">
              Event ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="id"
              name="id"
              placeholder="teez-summer-2025"
              className={cn(fe.id && "border-destructive focus-visible:ring-destructive")}
            />
            <p className="text-xs text-muted-foreground">
              Used in the URL. Lowercase letters, numbers, and hyphens only. e.g.{" "}
              <span className="font-mono">teez-summer-2025</span>
            </p>
            <FieldError errors={fe.id} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="TEEZ Summer Gala 2025"
              className={cn(fe.title && "border-destructive focus-visible:ring-destructive")}
            />
            <FieldError errors={fe.title} />
          </div>

          {/* Event Kind + Planning Status side-by-side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eventKind">Event Kind</Label>
              <select
                id="eventKind"
                name="eventKind"
                defaultValue="SOCIAL"
                className={cn(selectCls, fe.eventKind && "border-destructive")}
              >
                <option value="SOCIAL">Social</option>
                <option value="THEMED">Themed</option>
                <option value="SIGNATURE">Signature</option>
                <option value="CORPORATE">Corporate</option>
              </select>
              <FieldError errors={fe.eventKind} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planningStatus">Initial Planning Status</Label>
              <select
                id="planningStatus"
                name="planningStatus"
                defaultValue="DRAFT"
                className={cn(selectCls, fe.planningStatus && "border-destructive")}
              >
                <option value="DRAFT">Draft</option>
                <option value="PLANNING">Planning</option>
                <option value="READY">Ready</option>
                <option value="LIVE">Live</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <FieldError errors={fe.planningStatus} />
            </div>
          </div>

          {/* Hosted By */}
          <div className="space-y-1.5">
            <Label htmlFor="hostedBy">Hosted By</Label>
            <Input
              id="hostedBy"
              name="hostedBy"
              placeholder="TEEZ Events"
              className={cn(fe.hostedBy && "border-destructive focus-visible:ring-destructive")}
            />
            <p className="text-xs text-muted-foreground">Organizer or company name shown on the event page.</p>
            <FieldError errors={fe.hostedBy} />
          </div>

          {/* Preview Description */}
          <div className="space-y-1.5">
            <Label htmlFor="previewDescription">Short Preview Description</Label>
            <Textarea
              id="previewDescription"
              name="previewDescription"
              placeholder="A brief teaser shown on the events listing page…"
              rows={2}
              maxLength={240}
              className={cn(
                "resize-none",
                fe.previewDescription && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <p className="text-xs text-muted-foreground">Max 240 characters. Shown on the public events listing.</p>
            <FieldError errors={fe.previewDescription} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 2: Date & Location ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 2
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold">Date &amp; Location</h2>
          </div>
          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Start Date &amp; Time</Label>
              <input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                className={cn(datetimeCls, fe.startsAt && "border-destructive")}
              />
              <FieldError errors={fe.startsAt} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endsAt">End Date &amp; Time</Label>
              <input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                className={cn(datetimeCls, fe.endsAt && "border-destructive")}
              />
              <FieldError errors={fe.endsAt} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue Name</Label>
            <Input
              id="venue"
              name="venue"
              placeholder="The Grand Ballroom"
              className={cn(fe.venue && "border-destructive focus-visible:ring-destructive")}
            />
            <FieldError errors={fe.venue} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              name="address"
              placeholder="123 Main St, Toronto, ON M5V 1A1"
              className={cn(fe.address && "border-destructive focus-visible:ring-destructive")}
            />
            <FieldError errors={fe.address} />
          </div>
        </CardContent>
      </Card>

      {/* ── Card 3: Capacity ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 3
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold">Capacity</h2>
          </div>
          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">
                Max Capacity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={100}
                placeholder="100"
                className={cn(fe.capacity && "border-destructive focus-visible:ring-destructive")}
              />
              <p className="text-xs text-muted-foreground">Hard venue or ticketing limit.</p>
              <FieldError errors={fe.capacity} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedAttendance">Expected Attendance</Label>
              <Input
                id="expectedAttendance"
                name="expectedAttendance"
                type="number"
                min={1}
                placeholder="80"
                className={cn(fe.expectedAttendance && "border-destructive focus-visible:ring-destructive")}
              />
              <p className="text-xs text-muted-foreground">Realistic estimate for planning purposes.</p>
              <FieldError errors={fe.expectedAttendance} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 4: Planning Details ── */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 4
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold">Planning Details</h2>
          </div>
          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ownerEmail">Event Manager Email</Label>
              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="planner@example.com"
                className={cn(fe.ownerEmail && "border-destructive focus-visible:ring-destructive")}
              />
              <FieldError errors={fe.ownerEmail} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budgetDollars">Total Budget (CAD $)</Label>
              <Input
                id="budgetDollars"
                name="budgetDollars"
                type="number"
                min={0}
                step="0.01"
                placeholder="5000.00"
                className={cn(fe.budgetDollars && "border-destructive focus-visible:ring-destructive")}
              />
              <p className="text-xs text-muted-foreground">Stored in cents internally. Enter in dollars (e.g. 5000 = $5,000).</p>
              <FieldError errors={fe.budgetDollars} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="vip, outdoor, summer"
              className={cn(fe.tags && "border-destructive focus-visible:ring-destructive")}
            />
            <p className="text-xs text-muted-foreground">Separate with commas: vip, outdoor, summer</p>
            <FieldError errors={fe.tags} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea
              id="internalNotes"
              name="internalNotes"
              placeholder="Planning notes, vendor contacts, special requirements…"
              rows={4}
              maxLength={2000}
              className={cn(
                "resize-y",
                fe.internalNotes && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <p className="text-xs text-muted-foreground">Internal only — not shown publicly. Max 2000 characters.</p>
            <FieldError errors={fe.internalNotes} />
          </div>
        </CardContent>
      </Card>

      <SubmitButton />
    </form>
  )
}
