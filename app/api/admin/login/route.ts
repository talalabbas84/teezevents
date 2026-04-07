import { NextResponse } from "next/server"
import { z } from "zod"

import { createAdminSession, validateAdminCredentials } from "@/lib/admin-auth"

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => null)
    const parsed = loginSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login request." }, { status: 400 })
    }

    if (!validateAdminCredentials(parsed.data.email, parsed.data.password)) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 })
    }

    await createAdminSession(parsed.data.email)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin authentication is not configured."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
