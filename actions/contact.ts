"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getPrismaClient } from "@/lib/prisma"
import { isAdminAuthenticated } from "@/lib/admin-auth"

const submitSchema = z.object({
  name: z.string().min(1).max(120).transform((s) => s.trim()),
  email: z.string().email().max(120).transform((s) => s.trim().toLowerCase()),
  phone: z.string().max(40).optional().transform((s) => s?.trim() || undefined),
  eventType: z.string().max(80).optional().transform((s) => s?.trim() || undefined),
  preferredDate: z.string().max(40).optional().transform((s) => s?.trim() || undefined),
  message: z.string().min(1).max(5000).transform((s) => s.trim()),
  source: z.string().max(80).optional().transform((s) => s?.trim() || undefined),
})

export async function submitContactInquiry(
  _prev: unknown,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    eventType: formData.get("eventType"),
    preferredDate: formData.get("date"),
    message: formData.get("message"),
    source: formData.get("source"),
  }

  const result = submitSchema.safeParse(raw)
  if (!result.success) {
    const first = Object.values(result.error.flatten().fieldErrors).flat()[0]
    return { success: false, error: first ?? "Please check your form and try again." }
  }

  try {
    const prisma = getPrismaClient()
    await prisma.contactInquiry.create({ data: result.data })
    return { success: true }
  } catch {
    return { success: false, error: "Something went wrong. Please try again or email us directly." }
  }
}

export async function updateInquiryStatus(
  id: string,
  status: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminAuthenticated())) return { success: false, error: "Not authorized." }

  try {
    const prisma = getPrismaClient()
    await prisma.contactInquiry.update({
      where: { id },
      data: {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
    })
    revalidatePath("/admin/contact-inquiries")
    return { success: true }
  } catch {
    return { success: false, error: "Failed to update inquiry." }
  }
}

export async function getContactInquiries(status?: string) {
  if (!(await isAdminAuthenticated())) return []
  const prisma = getPrismaClient()
  return prisma.contactInquiry.findMany({
    where: status && status !== "ALL" ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  })
}

export async function getNewInquiryCount(): Promise<number> {
  if (!(await isAdminAuthenticated())) return 0
  const prisma = getPrismaClient()
  return prisma.contactInquiry.count({ where: { status: "NEW" } })
}
