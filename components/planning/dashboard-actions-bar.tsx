"use client"

import { useState } from "react"
import { BookMarked, LayoutTemplate } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApplyBlueprintDialog } from "@/components/planning/apply-blueprint-dialog"
import { SaveAsBlueprintDialog } from "@/components/planning/save-as-blueprint-dialog"

interface Blueprint {
  id: string
  name: string
  description: string | null
  category: string | null
}

interface DashboardActionsBarProps {
  eventId: string
  eventTitle: string
  blueprints: Blueprint[]
}

export function DashboardActionsBar({ eventId, eventTitle, blueprints }: DashboardActionsBarProps) {
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [saveBlueprintOpen, setSaveBlueprintOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setApplyDialogOpen(true)}
        className="inline-flex items-center gap-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
        title={blueprints.length === 0 ? "No blueprints available" : "Apply a blueprint to this event"}
      >
        <LayoutTemplate size={14} />
        Apply Blueprint
        {blueprints.length === 0 && (
          <span className="ml-1 text-[10px] text-muted-foreground">(none)</span>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setSaveBlueprintOpen(true)}
        className="inline-flex items-center gap-2 border-[#c57a3a]/40 text-[#c57a3a] hover:bg-[#c57a3a] hover:text-white"
        title="Save this event as a reusable blueprint"
      >
        <BookMarked size={14} />
        Save as Blueprint
      </Button>

      <ApplyBlueprintDialog
        eventId={eventId}
        blueprints={blueprints}
        open={applyDialogOpen}
        onClose={() => setApplyDialogOpen(false)}
      />

      <SaveAsBlueprintDialog
        eventId={eventId}
        eventTitle={eventTitle}
        open={saveBlueprintOpen}
        onClose={() => setSaveBlueprintOpen(false)}
      />
    </>
  )
}
