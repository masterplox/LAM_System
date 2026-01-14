"use client"

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
import { createClient } from "@/lib/supabase/client"
import type React from "react"
import { useEffect, useState } from "react"
import { BuyerSelector } from "./buyer-selector"

interface HoldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subdivisionId: string
  subdivisionTitle: string
  currentBuyerId?: string | null
  onSubmit: (buyerId: string, holdAmount: number, holdUntilDate: string, notes?: string) => Promise<boolean>
}

export function HoldDialog({
  open,
  onOpenChange,
  subdivisionId,
  subdivisionTitle,
  currentBuyerId,
  onSubmit,
}: HoldDialogProps) {
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("")
  const [holdAmount, setHoldAmount] = useState("")
  const [holdUntilDate, setHoldUntilDate] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingBuyer, setIsAddingBuyer] = useState(false)
  const [newBuyerFirstName, setNewBuyerFirstName] = useState("")
  const [newBuyerMiddleName, setNewBuyerMiddleName] = useState("")
  const [newBuyerLastName, setNewBuyerLastName] = useState("")
  const [newBuyerEmail, setNewBuyerEmail] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")

  useEffect(() => {
    if (open) {
      console.log("[HoldDialog] Dialog opened - currentBuyerId received:", currentBuyerId)
      // Set buyer ID if available
      if (currentBuyerId) {
        console.log("[HoldDialog] Setting selectedBuyerId to:", currentBuyerId)
        setSelectedBuyerId(currentBuyerId)
      } else {
        console.log("[HoldDialog] No buyer ID, setting to empty string")
        setSelectedBuyerId("")
      }
      // Set default date to 30 days from now
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setHoldUntilDate(defaultDate.toISOString().split("T")[0])
    }
  }, [open, currentBuyerId])

  const handleAddBuyer = async () => {
    if (!newBuyerFirstName.trim() || !newBuyerLastName.trim()) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Combine names for buyer record
    const fullName = [newBuyerFirstName.trim(), newBuyerMiddleName.trim(), newBuyerLastName.trim()]
      .filter(Boolean)
      .join(" ")

    const { data, error } = await supabase
      .from("buyers")
      .insert({
        name: fullName,
        email: newBuyerEmail.trim() || null,
        phone: newBuyerPhone.trim() || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setSelectedBuyerId(data.id)
      setIsAddingBuyer(false)
      setNewBuyerFirstName("")
      setNewBuyerMiddleName("")
      setNewBuyerLastName("")
      setNewBuyerEmail("")
      setNewBuyerPhone("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBuyerId || !holdAmount || !holdUntilDate) return

    setIsLoading(true)
    const success = await onSubmit(
      selectedBuyerId,
      Number.parseFloat(holdAmount),
      holdUntilDate,
      notes.trim() || undefined,
    )
    setIsLoading(false)

    if (success) {
      onOpenChange(false)
      setHoldAmount("")
      setNotes("")
    }
  }

  const calculateDaysRemaining = () => {
    if (!holdUntilDate) return null
    const today = new Date()
    const holdDate = new Date(holdUntilDate)
    const diffTime = holdDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = calculateDaysRemaining()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Lot on Hold</DialogTitle>
          <DialogDescription>
            Reserve this lot for a buyer. The lot will be held until the specified date.
          </DialogDescription>
        </DialogHeader>

        {isAddingBuyer ? (
          <div className="space-y-4 py-4">
            <h4 className="font-medium">Create New Buyer</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="buyerFirstName">First Name *</Label>
                <Input
                  id="buyerFirstName"
                  value={newBuyerFirstName}
                  onChange={(e) => setNewBuyerFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerMiddleName">Middle Name</Label>
                <Input
                  id="buyerMiddleName"
                  value={newBuyerMiddleName}
                  onChange={(e) => setNewBuyerMiddleName(e.target.value)}
                  placeholder="Middle name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerLastName">Last Name *</Label>
                <Input
                  id="buyerLastName"
                  value={newBuyerLastName}
                  onChange={(e) => setNewBuyerLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Email</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={newBuyerEmail}
                  onChange={(e) => setNewBuyerEmail(e.target.value)}
                  placeholder="Enter email (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerPhone">Phone</Label>
                <Input
                  id="buyerPhone"
                  value={newBuyerPhone}
                  onChange={(e) => setNewBuyerPhone(e.target.value)}
                  placeholder="Enter phone (optional)"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingBuyer(false)
                  setNewBuyerFirstName("")
                  setNewBuyerMiddleName("")
                  setNewBuyerLastName("")
                  setNewBuyerEmail("")
                  setNewBuyerPhone("")
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBuyer}
                disabled={!newBuyerFirstName.trim() || !newBuyerLastName.trim()}
                className="flex-1"
              >
                Add Buyer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Lot: {subdivisionTitle}</p>
              </div>

              <BuyerSelector
                value={selectedBuyerId || undefined}
                onValueChange={setSelectedBuyerId}
                onAddNew={() => setIsAddingBuyer(true)}
                label="Buyer *"
                placeholder="Select a buyer"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="holdAmount">Hold Amount ($) *</Label>
                  <Input
                    id="holdAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={holdAmount}
                    onChange={(e) => setHoldAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holdUntilDate">Hold Until Date *</Label>
                  <Input
                    id="holdUntilDate"
                    type="date"
                    value={holdUntilDate}
                    onChange={(e) => setHoldUntilDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              {daysRemaining !== null && (
                <div className="rounded-lg border p-2 text-sm">
                  <p className="text-muted-foreground">
                    Hold duration: <span className="font-medium">{daysRemaining} days</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this hold..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedBuyerId || !holdAmount || !holdUntilDate}>
                {isLoading ? "Placing Hold..." : "Place on Hold"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
