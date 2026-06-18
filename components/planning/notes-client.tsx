"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  createEventNote,
  deleteEventNote,
  toggleNotePin,
} from "@/actions/event-notes"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

import { Pin, PinOff, Trash2, Plus, StickyNote } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteSerialized = {
  id: string
  body: string
  authorEmail: string
  isPinned: boolean
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onTogglePin,
  onDelete,
  disabled,
}: {
  note: NoteSerialized
  onTogglePin: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  disabled: boolean
}) {
  return (
    <Card
      className={cn(
        "group border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md",
        note.isPinned && "border-[#c57a3a]/40 ring-1 ring-[#c57a3a]/20"
      )}
    >
      <CardContent className="p-4">
        {/* Top row */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {note.isPinned && (
              <Pin className="h-3.5 w-3.5 fill-[#c57a3a] text-[#c57a3a]" />
            )}
            <span className="text-xs font-medium text-stone-500">
              {note.authorEmail}
            </span>
          </div>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onTogglePin(note.id, note.isPinned)}
              disabled={disabled}
              title={note.isPinned ? "Unpin" : "Pin"}
              className="rounded p-1 text-stone-400 hover:bg-[#F7EDDB] hover:text-[#c57a3a] disabled:opacity-50"
            >
              {note.isPinned ? (
                <PinOff className="h-4 w-4" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onDelete(note.id)}
              disabled={disabled}
              title="Delete"
              className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
          {note.body}
        </p>

        {/* Footer */}
        <p className="mt-3 border-t border-stone-100 pt-2 text-xs text-stone-400">
          {formatDate(note.createdAt)}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotesClient({
  eventId,
  initialNotes,
}: {
  eventId: string
  initialNotes: NoteSerialized[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [notes, setNotes] = useState<NoteSerialized[]>(initialNotes)
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  const pinnedNotes = notes.filter((n) => n.isPinned)
  const unpinnedNotes = notes.filter((n) => !n.isPinned)

  // ── Create ───────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!body.trim()) {
      setError("Note cannot be empty.")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createEventNote(eventId, body.trim())
      if (res.success && res.data) {
        const created: NoteSerialized = {
          id: (res.data as { id: string }).id,
          body: body.trim(),
          authorEmail: "admin",
          isPinned: false,
          createdAt: new Date().toISOString(),
        }
        setNotes((prev) => [created, ...prev])
        setBody("")
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to create note.")
      }
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  async function handleDelete(noteId: string) {
    startTransition(async () => {
      const res = await deleteEventNote(noteId)
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to delete note.")
      }
    })
  }

  // ── Toggle pin ───────────────────────────────────────────────────────────
  async function handleTogglePin(noteId: string, currentPin: boolean) {
    startTransition(async () => {
      const res = await toggleNotePin(noteId, !currentPin)
      if (res.success) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, isPinned: !currentPin } : n
          )
        )
        router.refresh()
      } else {
        setError((res as { error?: string }).error ?? "Failed to update pin.")
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Add Note form ───────────────────────────────────────────────────── */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <Plus className="h-4 w-4 text-[#c57a3a]" />
            New Note
          </h2>
          {error && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Textarea
            value={body}
            onChange={(e) => {
              setError(null)
              setBody(e.target.value)
            }}
            placeholder="Write a note…"
            className="mb-3 min-h-[80px] bg-[#F7EDDB] placeholder:text-stone-400"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={isPending || !body.trim()}
              className="gap-2 bg-[#c57a3a] text-white hover:bg-[#a8652f] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Pinned notes ────────────────────────────────────────────────────── */}
      {pinnedNotes.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#c57a3a]">
            <Pin className="h-4 w-4 fill-[#c57a3a]" />
            Pinned
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                disabled={isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All notes ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
          <StickyNote className="h-4 w-4" />
          All Notes
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
            {notes.length}
          </span>
        </h2>

        {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 py-16 text-center">
            <StickyNote className="h-10 w-10 text-stone-300" />
            <p className="text-stone-400">No notes yet. Add one above.</p>
          </div>
        ) : unpinnedNotes.length === 0 ? (
          <p className="text-sm text-stone-400">All notes are pinned above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {unpinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
                disabled={isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
