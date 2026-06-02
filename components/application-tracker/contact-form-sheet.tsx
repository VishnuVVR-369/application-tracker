"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { Save, UserPlus } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { CONTACT_RELATIONSHIP_LABELS, CONTACT_RELATIONSHIPS } from "@/lib/contact-model"
import { Field, FormError, NativeSelect, SectionLabel } from "./form-kit"

type ContactFormSheetProps = {
  applications: Doc<"applications">[]
  applicationId?: string
  contact?: Doc<"applicationContacts">
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function buildInitialForm(applicationId: string, contact?: Doc<"applicationContacts">) {
  return {
    applicationId: contact?.applicationId ?? applicationId ?? "",
    name: contact?.name ?? "",
    relationshipType: (contact?.relationshipType ?? "recruiter") as string,
    roleTitle: contact?.roleTitle ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    linkedinUrl: contact?.linkedinUrl ?? "",
    notes: contact?.notes ?? "",
  }
}

export function ContactFormSheet({
  applications,
  applicationId,
  contact,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ContactFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const isEdit = Boolean(contact)
  const createContact = useMutation(api.contacts.create)
  const updateContact = useMutation(api.contacts.update)
  const [form, setForm] = React.useState(() => buildInitialForm(applicationId ?? "", contact))
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(buildInitialForm(applicationId ?? "", contact))
      setError("")
    }
    setOpen(next)
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError("A name is required.")
      return
    }
    if (!form.applicationId) {
      setError("Pick an application this person belongs to.")
      return
    }
    setPending(true)
    setError("")

    try {
      if (contact) {
        await updateContact({
          id: contact._id,
          name: form.name.trim(),
          relationshipType: form.relationshipType as never,
          roleTitle: form.roleTitle.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          notes: form.notes.trim() || undefined,
        })
      } else {
        await createContact({
          applicationId: form.applicationId as Id<"applications">,
          name: form.name.trim(),
          relationshipType: form.relationshipType as never,
          roleTitle: form.roleTitle.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          notes: form.notes.trim() || undefined,
        })
      }
      setOpen(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save contact")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit contact" : "Add contact"}</SheetTitle>
          <SheetDescription>
            Recruiters, referrers, hiring managers, and interviewers tied to an application.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 pb-4 pt-2">
          {!applicationId && !isEdit && (
            <Field label="Application">
              <NativeSelect
                value={form.applicationId}
                onChange={(value) => update("applicationId", value)}
              >
                <option value="">Select application…</option>
                {applications
                  .filter((application) => !application.archived)
                  .map((application) => (
                    <option key={application._id} value={application._id}>
                      {application.companyName} · {application.roleTitle}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </Field>
            <Field label="Relationship">
              <NativeSelect
                value={form.relationshipType}
                onChange={(value) => update("relationshipType", value)}
              >
                {CONTACT_RELATIONSHIPS.map((relationship) => (
                  <option key={relationship} value={relationship}>
                    {CONTACT_RELATIONSHIP_LABELS[relationship]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field label="Title" hint="optional">
            <Input
              value={form.roleTitle}
              onChange={(event) => update("roleTitle", event.target.value)}
              placeholder="e.g. Senior Technical Recruiter"
            />
          </Field>

          <SectionLabel>Reach</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            </Field>
          </div>
          <Field label="LinkedIn">
            <Input type="url" value={form.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>

          <FormError message={error} />

          <SheetFooter className="-mx-4 -mb-4 mt-2 flex-row justify-end gap-2 border-t border-line/70 bg-surface-1/40 px-4">
            <SheetClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending}>
              {isEdit ? <Save className="size-4" /> : <UserPlus className="size-4" />}
              {pending ? "Saving…" : isEdit ? "Save contact" : "Add contact"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
