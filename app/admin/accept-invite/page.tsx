import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { AcceptInviteForm } from "@/components/admin/accept-invite-form"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getPrismaClient } from "@/lib/prisma"

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const prisma = getPrismaClient()

  const member = token
    ? await prisma.teamMember.findUnique({
        where: { inviteToken: token },
        select: { email: true, name: true, status: true },
      })
    : null

  const isValidInvite = Boolean(member && member.status === "INVITED" && token)

  return (
    <main className="min-h-screen bg-[#F7EDDB] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Card className="border border-border shadow-xl">
          <CardContent className="space-y-6 p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <ShieldCheck size={16} />
              Team Access
            </div>

            <div>
              <h1 className="font-serif text-4xl font-bold">Accept Invite</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Activate your TEEZ team account.
              </p>
            </div>

            {isValidInvite && member && token ? (
              <AcceptInviteForm
                token={token}
                email={member.email}
                initialName={member.name ?? ""}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm">
                  This invite link is invalid or has already been used.
                </div>
                <Button asChild variant="outline" className="border-primary text-primary">
                  <Link href="/admin/login">Go to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
