"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BookMarked, CheckCircle2, ListChecks, DollarSign, ClipboardList, CalendarDays } from "lucide-react"

import { saveEventAsBlueprint } from "@/actions/planning"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  eventId: string
  eventTitle: string
  open: boolean
  onClose: () => void
}

const SAVED_ITEMS = [
  { icon: ListChecks, label: "Tasks" },
  { icon: CheckCircle2, label: "Checklists" },
  { icon: DollarSign, label: "Budget items" },
  { icon: ClipboardList, label: "Run sheet" },
  { icon: CalendarDays, label: "Timeline" },
]

export function SaveAsBlueprintDialog({ eventId, eventTitle, open, onClose }: Props) {
  const [name, setName] = useState(`${eventTitle} Blueprint`)
  const [description, setDescription] = useState("")
  const [savedBlueprintId, setSavedBlueprintId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    if (isPending) return
    setSavedBlueprintId(null)
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      const result = await saveEventAsBlueprint(
        eventId,
        name.trim(),
        description.trim() || undefined
      )

      if (result.success && result.data) {
        toast.success("Blueprint saved!")
        setSavedBlueprintId(result.data.blueprintId)
      } else {
        toast.error(result.error ?? "Failed to save blueprint")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-[#c57a3a]" />
            Save as Blueprint
          </DialogTitle>
          <DialogDescription>
            Save this event&apos;s planning data as a reusable blueprint for future events.
          </DialogDescription>
        </DialogHeader>

        {savedBlueprintId ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800">Blueprint saved successfully!</p>
                <p className="mt-1 text-sm text-emerald-700">&ldquo;{name}&rdquo; is now available for future events.</p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                <Link href="/admin/blueprints">View Blueprints →</Link>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* What gets saved */}
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                What will be saved
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {SAVED_ITEMS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-sm text-stone-600">
                    <Icon className="h-3.5 w-3.5 text-[#c57a3a]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="blueprint-name" className="text-sm font-medium text-stone-700">
                Blueprint Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="blueprint-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Corporate Gala Template"
                required
                disabled={isPending}
                className="border-stone-300 focus-visible:ring-[#c57a3a]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="blueprint-description" className="text-sm font-medium text-stone-700">
                Description <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="blueprint-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when to use this blueprint…"
                rows={3}
                disabled={isPending}
                className="resize-none border-stone-300 focus-visible:ring-[#c57a3a]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || isPending}
                className="bg-[#c57a3a] text-white hover:bg-[#8B5A2B]"
              >
                {isPending ? "Saving…" : "Save Blueprint"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
