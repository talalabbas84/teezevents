"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { applyBlueprintToEvent } from "@/actions/planning"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Blueprint {
  id: string
  name: string
  description: string | null
  category: string | null
}

interface ApplyBlueprintDialogProps {
  eventId: string
  blueprints: Blueprint[]
  open: boolean
  onClose: () => void
}

export function ApplyBlueprintDialog({
  eventId,
  blueprints,
  open,
  onClose,
}: ApplyBlueprintDialogProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    if (isPending) return
    setSelectedId(null)
    onClose()
  }

  function handleApply() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await applyBlueprintToEvent(eventId, selectedId)
      if (result.success) {
        toast.success("Blueprint applied")
        setSelectedId(null)
        onClose()
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to apply blueprint")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Apply Blueprint</DialogTitle>
          <DialogDescription>
            Choose a blueprint to pre-populate tasks, checklists, and budget items for this event.
          </DialogDescription>
        </DialogHeader>

        {blueprints.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No blueprints available yet.</p>
            <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Link href="/admin/blueprints/new">Create a Blueprint</Link>
            </Button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {blueprints.map((bp) => (
              <button
                key={bp.id}
                type="button"
                onClick={() => setSelectedId(bp.id)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                  selectedId === bp.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border bg-white hover:bg-[#F7EDDB]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{bp.name}</span>
                  {bp.category && (
                    <Badge variant="secondary" className="text-xs">
                      {bp.category}
                    </Badge>
                  )}
                </div>
                {bp.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {bp.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          {blueprints.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={!selectedId || isPending}
              className="bg-primary text-primary-foreground hover:bg-accent"
            >
              {isPending ? "Applying…" : "Apply Blueprint"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
