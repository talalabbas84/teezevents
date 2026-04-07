"use client"

import type { FormEvent } from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AdminLoginForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (disabled) {
      return
    }

    setError("")
    setIsSubmitting(true)

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }).catch(() => null)

    if (!response) {
      setIsSubmitting(false)
      setError("Network error. Please try again.")
      return
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      setIsSubmitting(false)
      setError(payload?.error || "Unable to sign in.")
      return
    }

    router.replace("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="admin-email">Admin Email</Label>
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
          disabled={isSubmitting || disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your admin password"
          required
          disabled={isSubmitting || disabled}
        />
      </div>

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm">{error}</div>}

      <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-accent" disabled={isSubmitting || disabled}>
        {isSubmitting ? "Signing In..." : "Sign In to Dashboard"}
      </Button>
    </form>
  )
}
