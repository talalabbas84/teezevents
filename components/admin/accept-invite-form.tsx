"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { acceptTeamInvite } from "@/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AcceptInviteForm({
  token,
  email,
  initialName,
}: {
  token: string
  email: string
  initialName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialName)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    startTransition(async () => {
      const result = await acceptTeamInvite({
        token,
        name: name.trim() || undefined,
        password,
      })

      if (!result.success) {
        setError(result.error ?? "Unable to accept invite.")
        return
      }

      toast.success("Invite accepted.")
      router.replace("/admin")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Invite</div>
        <div className="mt-1 font-medium">{email}</div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-name">Name</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-password">Password</Label>
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          minLength={8}
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-confirm-password">Confirm Password</Label>
        <Input
          id="invite-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm your password"
          minLength={8}
          required
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-accent"
        disabled={isPending || password.length < 8 || confirmPassword.length < 8}
      >
        {isPending ? "Activating..." : "Activate Account"}
      </Button>
    </form>
  )
}
