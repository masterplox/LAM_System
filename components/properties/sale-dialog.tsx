"use client"

import type React from "react"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { BuyerSelector } from "./buyer-selector"

export interface Buyer {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

interface SaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (buyerId: string, salePrice: number, paymentPlan: "full" | "mortgage" | "hold", interestRate?: number, gracePeriod?: number, holdAmount?: number, holdUntilDate?: string) => Promise<boolean>
  title: string
  description: string
  initialBuyerId?: string
  initialSalePrice?: number
  disabled?: boolean
  disabledMessage?: string
}

export function SaleDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  initialBuyerId,
  initialSalePrice,
  disabled,
  disabledMessage,
}: SaleDialogProps) {
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("")
  const [salePrice, setSalePrice] = useState(initialSalePrice?.toString() || "")
  const [paymentPlan, setPaymentPlan] = useState<"full" | "mortgage" | "hold">("full")
  const [customInterestRate, setCustomInterestRate] = useState("")
  const [gracePeriodDays, setGracePeriodDays] = useState("30")
  const [holdAmount, setHoldAmount] = useState("")
  const [holdUntilDate, setHoldUntilDate] = useState("")
  const [globalInterestRate, setGlobalInterestRate] = useState(0.001) // Default 0.1% per day
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingBuyer, setIsAddingBuyer] = useState(false)
  const [newBuyerFirstName, setNewBuyerFirstName] = useState("")
  const [newBuyerMiddleName, setNewBuyerMiddleName] = useState("")
  const [newBuyerLastName, setNewBuyerLastName] = useState("")
  const [newBuyerEmail, setNewBuyerEmail] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")

  useEffect(() => {
    if (open) {
      console.log("[SaleDialog] Dialog opened - initialBuyerId received:", initialBuyerId)
      fetchGlobalInterestRate()
      // Set buyer ID if available
      if (initialBuyerId) {
        console.log("[SaleDialog] Setting selectedBuyerId to:", initialBuyerId)
        setSelectedBuyerId(initialBuyerId)
      } else {
        console.log("[SaleDialog] No buyer ID, setting to empty string")
        setSelectedBuyerId("")
      }
      setSalePrice(initialSalePrice?.toString() || "")
      // Set default hold date to 30 days from now
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setHoldUntilDate(defaultDate.toISOString().split("T")[0])
    }
  }, [open, initialBuyerId, initialSalePrice])

  const fetchGlobalInterestRate = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("user_id", user.id)
      .eq("setting_key", "global_daily_interest_rate")
      .single()

    if (data) {
      setGlobalInterestRate(Number.parseFloat(data.setting_value))
    }
  }


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
    if (!selectedBuyerId || !salePrice) return

    // Validate hold-specific fields
    if (paymentPlan === "hold") {
      if (!holdAmount || !holdUntilDate) {
        alert("Please enter hold amount and hold until date")
        return
      }
    }

    setIsLoading(true)
    const interestRate = customInterestRate ? Number.parseFloat(customInterestRate) : undefined
    const gracePeriod = gracePeriodDays ? Number.parseInt(gracePeriodDays) : undefined
    const holdAmt = holdAmount ? Number.parseFloat(holdAmount) : undefined
    const success = await onSubmit(
      selectedBuyerId,
      Number.parseFloat(salePrice),
      paymentPlan,
      interestRate,
      gracePeriod,
      holdAmt,
      holdUntilDate || undefined,
    )
    setIsLoading(false)

    if (success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {disabled ? (
          <div className="py-6 text-center text-muted-foreground">{disabledMessage}</div>
        ) : isAddingBuyer ? (
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
              <BuyerSelector
                value={selectedBuyerId || undefined}
                onValueChange={setSelectedBuyerId}
                onAddNew={() => setIsAddingBuyer(true)}
                label="Buyer *"
                placeholder="Select a buyer"
              />
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Enter sale price"
                  required
                />
              </div>

              {/* Payment Plan Selection */}
              <div className="space-y-3 border-t pt-3">
                <Label>Payment Plan *</Label>
                <RadioGroup value={paymentPlan} onValueChange={(value) => setPaymentPlan(value as "full" | "mortgage" | "hold")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="plan-full" />
                    <Label htmlFor="plan-full" className="font-normal cursor-pointer">
                      Full Payment (paid in full immediately)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mortgage" id="plan-mortgage" />
                    <Label htmlFor="plan-mortgage" className="font-normal cursor-pointer">
                      Mortgage (installments with interest)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hold" id="plan-hold" />
                    <Label htmlFor="plan-hold" className="font-normal cursor-pointer">
                      Hold (partial payment with deadline)
                    </Label>
                  </div>
                </RadioGroup>

                {/* Mortgage Options */}
                {paymentPlan === "mortgage" && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/50">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="customInterestRate">
                          Daily Interest Rate (optional)
                          <span className="text-xs text-muted-foreground ml-1">
                            (default: {(globalInterestRate * 100).toFixed(3)}% per day)
                          </span>
                        </Label>
                        <Input
                          id="customInterestRate"
                          type="number"
                          step="0.000001"
                          min="0"
                          max="1"
                          value={customInterestRate}
                          onChange={(e) => setCustomInterestRate(e.target.value)}
                          placeholder="e.g., 0.001 (0.1%)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                        <Input
                          id="gracePeriod"
                          type="number"
                          min="0"
                          value={gracePeriodDays}
                          onChange={(e) => setGracePeriodDays(e.target.value)}
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Interest starts accruing after the grace period. Daily interest is calculated on the remaining balance.
                    </p>
                  </div>
                )}

                {/* Hold Options */}
                {paymentPlan === "hold" && (
                  <div className="space-y-3 rounded-lg border p-3 bg-muted/50">
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
                          required={paymentPlan === "hold"}
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
                          required={paymentPlan === "hold"}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If payment is not completed by this date, the lot can be recalled and made available again.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !selectedBuyerId ||
                  !salePrice ||
                  (paymentPlan === "hold" && (!holdAmount || !holdUntilDate))
                }
              >
                {isLoading ? "Saving..." : "Record Sale Agreement"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
