"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { getPrismaClient } from "@/lib/prisma"

// ─── Validation schema ────────────────────────────────────────────────────────

const VENDOR_TYPES = [
  "VENUE", "DJ", "PHOTOGRAPHER", "VIDEOGRAPHER", "SECURITY",
  "CATERING", "DECOR", "LIGHTING", "SOUND", "PERFORMER", "SPONSOR", "OTHER",
] as const

const GlobalVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  vendorType: z.enum(VENDOR_TYPES).default("OTHER"),
  contactName: z.string().max(200).optional(),
  email: z.string().email("Invalid email").max(200).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(100)).optional(),
  rating: z.number().int().min(1).max(5).optional(),
})

const GlobalVendorUpdateSchema = GlobalVendorSchema.partial()

// ─── Helper ───────────────────────────────────────────────────────────────────

function sanitize<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data }
  for (const key of Object.keys(result)) {
    if (result[key] === "") {
      ;(result as Record<string, unknown>)[key] = undefined
    }
  }
  return result
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createGlobalVendor(data: {
  name: string
  vendorType?: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  notes?: string
  tags?: string[]
  rating?: number
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const parsed = GlobalVendorSchema.parse(sanitize(data as Record<string, unknown>))
    const db = getPrismaClient()

    await db.globalVendor.create({
      data: {
        name: parsed.name,
        vendorType: parsed.vendorType ?? "OTHER",
        contactName: parsed.contactName ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        website: parsed.website ?? null,
        notes: parsed.notes ?? null,
        tags: parsed.tags ?? [],
        rating: parsed.rating ?? null,
        isActive: true,
      },
    })

    revalidatePath("/admin/vendors")
    return { success: true }
  } catch (error) {
    console.error("[createGlobalVendor]", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? "Validation error." }
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to create vendor." }
  }
}

export async function updateGlobalVendor(
  id: string,
  data: {
    name?: string
    vendorType?: string
    contactName?: string
    email?: string
    phone?: string
    website?: string
    notes?: string
    tags?: string[]
    rating?: number
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const parsed = GlobalVendorUpdateSchema.parse(sanitize(data as Record<string, unknown>))
    const db = getPrismaClient()

    await db.globalVendor.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.vendorType !== undefined && { vendorType: parsed.vendorType }),
        ...(parsed.contactName !== undefined && { contactName: parsed.contactName }),
        ...(parsed.email !== undefined && { email: parsed.email }),
        ...(parsed.phone !== undefined && { phone: parsed.phone }),
        ...(parsed.website !== undefined && { website: parsed.website }),
        ...(parsed.notes !== undefined && { notes: parsed.notes }),
        ...(parsed.tags !== undefined && { tags: parsed.tags }),
        ...(parsed.rating !== undefined && { rating: parsed.rating }),
      },
    })

    revalidatePath("/admin/vendors")
    return { success: true }
  } catch (error) {
    console.error("[updateGlobalVendor]", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message ?? "Validation error." }
    }
    return { success: false, error: error instanceof Error ? error.message : "Failed to update vendor." }
  }
}

export async function deleteGlobalVendor(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isAdminAuthenticated())) {
      return { success: false, error: "Not authorized." }
    }

    const db = getPrismaClient()
    await db.globalVendor.delete({ where: { id } })

    revalidatePath("/admin/vendors")
    return { success: true }
  } catch (error) {
    console.error("[deleteGlobalVendor]", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete vendor." }
  }
}
