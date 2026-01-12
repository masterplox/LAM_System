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

interface SubdivisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, description: string, cost: number) => Promise<boolean>
  title: string
  description: string
  initialTitle?: string
  initialDescription?: string
  initialCost?: number
}

export function SubdivisionDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  initialTitle = "",
  initialDescription = "",
  initialCost = 0,
}: SubdivisionDialogProps) {
  const [subdivisionTitle, setSubdivisionTitle] = useState(initialTitle)
  const [subdivisionDescription, setSubdivisionDescription] = useState(initialDescription)
  const [subdivisionCost, setSubdivisionCost] = useState(initialCost.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setSubdivisionTitle(initialTitle)
      setSubdivisionDescription(initialDescription)
      setSubdivisionCost(initialCost.toString())
    }
  }, [open, initialTitle, initialDescription, initialCost])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subdivisionTitle.trim()) return

    setIsSubmitting(true)
    const cost = Number.parseFloat(subdivisionCost) || 0
    const success = await onSubmit(subdivisionTitle.trim(), subdivisionDescription.trim(), cost)
    setIsSubmitting(false)

    if (success) {
      onOpenChange(false)
      setSubdivisionTitle("")
      setSubdivisionDescription("")
      setSubdivisionCost("0")
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
              <Label htmlFor="subdivision-title">Title</Label>
              <Input
                id="subdivision-title"
                value={subdivisionTitle}
                onChange={(e) => setSubdivisionTitle(e.target.value)}
                placeholder="Enter subdivision title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subdivision-description">Description</Label>
              <Textarea
                id="subdivision-description"
                value={subdivisionDescription}
                onChange={(e) => setSubdivisionDescription(e.target.value)}
                placeholder="Enter subdivision description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subdivision-cost">Cost ($)</Label>
              <Input
                id="subdivision-cost"
                type="number"
                min="0"
                step="0.01"
                value={subdivisionCost}
                onChange={(e) => setSubdivisionCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !subdivisionTitle.trim()}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
