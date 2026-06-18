"use client"

import { UserRound, UsersRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type TeamMemberOption = {
  id: string
  email: string
  name: string | null
  role: string
  avatarColor: string | null
}

const UNASSIGNED_VALUE = "__unassigned"

function getInitials(member: TeamMemberOption) {
  if (member.name) {
    const parts = member.name.trim().split(/\s+/)
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }

  return member.email.slice(0, 2).toUpperCase()
}

function getMemberLabel(member: TeamMemberOption) {
  return member.name ? `${member.name} (${member.email})` : member.email
}

export function isValidAssignee(value: string, members: TeamMemberOption[]) {
  return !value || members.some((member) => member.email === value)
}

export function areValidAssignees(values: string[], members: TeamMemberOption[]) {
  return values.every((value) => isValidAssignee(value, members))
}

function MemberPill({ member }: { member: TeamMemberOption }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-xs">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ backgroundColor: member.avatarColor ?? "#c57a3a" }}
      >
        {getInitials(member)}
      </span>
      <span className="max-w-[130px] truncate">{member.name ?? member.email}</span>
    </span>
  )
}

export function AssigneeSelect({
  value,
  members,
  onChange,
  disabled,
  placeholder = "Select assignee",
}: {
  value: string
  members: TeamMemberOption[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const selectedMember = members.find((member) => member.email === value)

  return (
    <Select
      value={value || UNASSIGNED_VALUE}
      onValueChange={(nextValue) => onChange(nextValue === UNASSIGNED_VALUE ? "" : nextValue)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full bg-white border-border">
        <SelectValue placeholder={placeholder}>
          {selectedMember ? getMemberLabel(selectedMember) : "Unassigned"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" />
            </span>
            Unassigned
          </span>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.email}>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: member.avatarColor ?? "#c57a3a" }}
              >
                {getInitials(member)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {member.name ?? member.email}
                </span>
                {member.name && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                )}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MultiAssigneeSelect({
  value,
  members,
  onChange,
  disabled,
  placeholder = "Select collaborators",
}: {
  value: string[]
  members: TeamMemberOption[]
  onChange: (value: string[]) => void
  disabled?: boolean
  placeholder?: string
}) {
  const selectedMembers = members.filter((member) => value.includes(member.email))

  function toggleMember(email: string) {
    if (value.includes(email)) {
      onChange(value.filter((item) => item !== email))
    } else {
      onChange([...value, email])
    }
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "min-h-9 w-full justify-start gap-2 bg-white px-3 text-left font-normal",
              selectedMembers.length === 0 && "text-muted-foreground",
            )}
          >
            <UsersRound className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedMembers.length === 0
                ? placeholder
                : `${selectedMembers.length} collaborator${selectedMembers.length === 1 ? "" : "s"} selected`}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-72">
          {members.map((member) => (
            <DropdownMenuCheckboxItem
              key={member.id}
              checked={value.includes(member.email)}
              onCheckedChange={() => toggleMember(member.email)}
              onSelect={(event) => event.preventDefault()}
              className="items-start"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: member.avatarColor ?? "#c57a3a" }}
                >
                  {getInitials(member)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {member.name ?? member.email}
                  </span>
                  {member.name && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  )}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <MemberPill key={member.id} member={member} />
          ))}
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
