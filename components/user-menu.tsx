"use client"

import { useMutation, useQuery } from "convex/react"
import { BellIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { errorMessage } from "@/lib/errors"

export function UserMenu() {
  const user = useQuery(api.auth.currentUser)
  const { theme, setTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const initials = (user?.name || user?.email || "?").slice(0, 1).toUpperCase()

  if (!user) return <Skeleton className="size-8 rounded-full" />

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar from GitHub, tiny and already sized
              <img src={user.image} alt="" className="size-7 rounded-full" />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {initials}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
            <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
            <BellIcon />
            Follow-up timing
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "dark" ? <MoonIcon /> : theme === "light" ? <SunIcon /> : <MonitorIcon />}
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void authClient.signOut()}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FollowUpSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}

function FollowUpSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const settings = useQuery(api.settings.get)
  const setFollowUpDays = useMutation(api.settings.setFollowUpDays)
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? String(settings?.followUpDays ?? "")

  async function save(event: React.FormEvent) {
    event.preventDefault()
    try {
      await setFollowUpDays({ days: Number(value) })
      onOpenChange(false)
      toast.success("Follow-up timing saved")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDraft(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Follow-up timing</DialogTitle>
            <DialogDescription>
              Referral requests with no reply get flagged for a follow-up after this many days.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="follow-up-days">Days to wait</Label>
            <Input
              id="follow-up-days"
              type="number"
              min={1}
              max={30}
              required
              value={value}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
