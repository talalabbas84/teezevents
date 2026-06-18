"use server"

import { z } from "zod"
import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

const CreateEventSchema = z.object({
  id: z
    .string()
    .min(2, "ID must be at least 2 characters")
    .max(80, "ID must be at most 80 characters")
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase letters, numbers, and hyphens only")
    .transform((s) => s.trim()),
  title: z
    .string()
    .min(2, "Title is required")
    .max(140, "Title must be at most 140 characters")
    .transform((s) => s.trim()),
  startsAt: z
    .string()
    .optional()
    .transform((s) => (s && s.length > 0 ? new Date(s) : undefined)),
  endsAt: z
    .string()
    .optional()
    .transform((s) => (s && s.length > 0 ? new Date(s) : undefined)),
  venue: z
    .string()
    .max(140)
    .optional()
    .transform((s) => s || undefined),
  address: z
    .string()
    .max(180)
    .optional()
    .transform((s) => s || undefined),
  hostedBy: z
    .string()
    .max(80)
    .optional()
    .transform((s) => s || undefined),
  previewDescription: z
    .string()
    .max(240)
    .optional()
    .transform((s) => s || undefined),
  eventKind: z
    .enum(["THEMED", "SIGNATURE", "CORPORATE", "SOCIAL"])
    .default("SOCIAL"),
  capacity: z.coerce.number().int().min(1).default(100),
  expectedAttendance: z
    .union([
      z.literal("").transform(() => undefined),
      z.coerce.number().int().min(1),
    ])
    .optional(),
  ownerEmail: z
    .union([
      z.literal("").transform(() => undefined),
      z.string().email("Must be a valid email address"),
    ])
    .optional(),
  budgetDollars: z
    .union([
      z.literal("").transform(() => undefined),
      z.coerce.number().min(0, "Budget must be 0 or greater"),
    ])
    .optional(),
  internalNotes: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => s || undefined),
  tags: z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(",").map((t) => t.trim()).filter(Boolean) : []
    ),
  planningStatus: z
    .enum(["DRAFT", "PLANNING", "READY", "LIVE", "COMPLETED", "CANCELLED", "ARCHIVED"])
    .default("DRAFT"),
})

export type CreateEventState = {
  error?: string
  fieldErrors?: Record<string, string[]>
} | null

export async function createNewEvent(
  prevState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Not authorized." }
  }

  const rawId = formData.get("id") as string | null

  const raw = {
    id: formData.get("id"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    venue: formData.get("venue"),
    address: formData.get("address"),
    hostedBy: formData.get("hostedBy"),
    previewDescription: formData.get("previewDescription"),
    eventKind: formData.get("eventKind"),
    capacity: formData.get("capacity"),
    expectedAttendance: formData.get("expectedAttendance"),
    ownerEmail: formData.get("ownerEmail"),
    budgetDollars: formData.get("budgetDollars"),
    internalNotes: formData.get("internalNotes"),
    tags: formData.get("tags"),
    planningStatus: formData.get("planningStatus"),
  }

  const result = CreateEventSchema.safeParse(raw)
  if (!result.success) {
    return {
      error: "Please fix the form errors below.",
      fieldErrors: result.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const data = result.data

  try {
    const prisma = getPrismaClient()

    const existing = await prisma.event.findUnique({
      where: { id: data.id },
      select: { id: true },
    })
    if (existing) {
      return {
        error: `An event with ID "${data.id}" already exists. Choose a different ID.`,
      }
    }

    await prisma.event.create({
      data: {
        id: data.id,
        title: data.title,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        venue: data.venue,
        address: data.address,
        hostedBy: data.hostedBy,
        previewDescription: data.previewDescription,
        eventKind: data.eventKind,
        category: "UPCOMING",
        ticketPriceCents: 0,
        capacity: data.capacity,
        checkoutEnabled: false,
        maxTicketsPerOrder: 4,
        featured: false,
        isActive: false,
        planningStatus: data.planningStatus,
        expectedAttendance: data.expectedAttendance,
        ownerEmail: data.ownerEmail,
        budgetTotalCents:
          data.budgetDollars != null
            ? Math.round(data.budgetDollars * 100)
            : undefined,
        internalNotes: data.internalNotes,
        tags: data.tags,
      },
    })

    revalidatePath("/admin/planning")
    revalidatePath("/admin/events")
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "An unexpected error occurred."
    return { error: message }
  }

  redirect(`/admin/planning/${rawId}/dashboard`)
}
