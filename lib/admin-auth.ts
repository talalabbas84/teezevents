import "server-only"

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getPrismaClient } from "@/lib/prisma"

const ADMIN_SESSION_COOKIE = "teez_admin_session"
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12

type AdminSessionPayload = {
  email: string
  exp: number
}

function getAdminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!email || !password || !sessionSecret) {
    throw new Error("Missing ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_SESSION_SECRET.")
  }

  return {
    email,
    password,
    sessionSecret,
  }
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url")
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function safeCompareBuffers(left: Buffer, right: Buffer) {
  if (left.length !== right.length) {
    return false
  }

  return timingSafeEqual(left, right)
}

function encodePayload(payload: AdminSessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

function parsePayload(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".")

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = signValue(encodedPayload, secret)

  if (!safeCompare(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminSessionPayload

    if (!payload.email || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt:${salt}:${hash}`
}

function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false
  }

  const [scheme, salt, hash] = storedHash.split(":")
  if (scheme !== "scrypt" || !salt || !hash) {
    return false
  }

  try {
    const expected = Buffer.from(hash, "hex")
    const actual = scryptSync(password, salt, 64)
    return safeCompareBuffers(actual, expected)
  } catch {
    return false
  }
}

export async function validateAdminCredentials(email: string, password: string) {
  const config = getAdminConfig()
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail === config.email && password === config.password) {
    return true
  }

  const prisma = getPrismaClient()
  const member = await prisma.teamMember.findUnique({
    where: { email: normalizedEmail },
    select: { passwordHash: true, status: true },
  })

  return member?.status === "ACTIVE" && verifyPassword(password, member.passwordHash)
}

export function getAdminSetupIssue() {
  try {
    getAdminConfig()
    return null
  } catch (error) {
    return error instanceof Error ? error.message : "Admin authentication is not configured."
  }
}

export async function createAdminSession(email: string) {
  const config = getAdminConfig()
  const store = await cookies()
  const normalizedEmail = email.trim().toLowerCase()

  const payload: AdminSessionPayload = {
    email: normalizedEmail,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  }
  const encodedPayload = encodePayload(payload)
  const signature = signValue(encodedPayload, config.sessionSecret)

  store.set(ADMIN_SESSION_COOKIE, `${encodedPayload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  })

  if (normalizedEmail !== config.email) {
    const prisma = getPrismaClient()
    await prisma.teamMember
      .update({
        where: { email: normalizedEmail },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => undefined)
  }
}

export async function clearAdminSession() {
  const store = await cookies()

  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export async function getAdminSession() {
  try {
    const config = getAdminConfig()
    const store = await cookies()
    const token = store.get(ADMIN_SESSION_COOKIE)?.value

    if (!token) {
      return null
    }

    const payload = parsePayload(token, config.sessionSecret)

    if (!payload) {
      return null
    }

    const normalizedEmail = payload.email.trim().toLowerCase()

    if (normalizedEmail === config.email) {
      return { ...payload, email: normalizedEmail }
    }

    const prisma = getPrismaClient()
    const member = await prisma.teamMember.findUnique({
      where: { email: normalizedEmail },
      select: { status: true },
    })

    if (member?.status !== "ACTIVE") {
      return null
    }

    return { ...payload, email: normalizedEmail }
  } catch {
    return null
  }
}

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession())
}

export async function requireAdminSession() {
  const session = await getAdminSession()

  if (!session) {
    redirect("/admin/login")
  }

  return session
}
