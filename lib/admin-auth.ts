import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

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

export function validateAdminCredentials(email: string, password: string) {
  const config = getAdminConfig()

  return email.trim().toLowerCase() === config.email && password === config.password
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

  if (normalizedEmail !== config.email) {
    throw new Error("Invalid admin email.")
  }

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

    if (!payload || payload.email !== config.email) {
      return null
    }

    return payload
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
