"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface PropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, description: string) => Promise<boolean>
  title: string
  description: string
  initialTitle?: string
  initialDescription?: string
}

export function PropertyDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  initialTitle = "",
  initialDescription = "",
}: PropertyDialogProps) {
  const [propertyTitle, setPropertyTitle] = useState(initialTitle)
  const [propertyDescription, setPropertyDescription] = useState(initialDescription)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setPropertyTitle(initialTitle)
      setPropertyDescription(initialDescription)
    }
  }, [open, initialTitle, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!propertyTitle.trim()) return

    setIsSubmitting(true)
    const success = await onSubmit(propertyTitle.trim(), propertyDescription.trim())
    setIsSubmitting(false)

    if (success) {
      onOpenChange(false)
      setPropertyTitle("")
      setPropertyDescription("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                placeholder="Enter property title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={propertyDescription}
                onChange={(e) => setPropertyDescription(e.target.value)}
                placeholder="Enter property description"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !propertyTitle.trim()}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
