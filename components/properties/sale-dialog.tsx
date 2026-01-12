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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

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
  onSubmit: (buyerId: string, salePrice: number) => Promise<boolean>
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
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [selectedBuyerId, setSelectedBuyerId] = useState(initialBuyerId || "")
  const [salePrice, setSalePrice] = useState(initialSalePrice?.toString() || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingBuyer, setIsAddingBuyer] = useState(false)
  const [newBuyerName, setNewBuyerName] = useState("")
  const [newBuyerEmail, setNewBuyerEmail] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")

  useEffect(() => {
    if (open) {
      fetchBuyers()
      setSelectedBuyerId(initialBuyerId || "")
      setSalePrice(initialSalePrice?.toString() || "")
    }
  }, [open, initialBuyerId, initialSalePrice])

  const fetchBuyers = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from("buyers").select("*").order("name")

    if (!error && data) {
      setBuyers(data)
    }
  }

  const handleAddBuyer = async () => {
    if (!newBuyerName.trim()) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("buyers")
      .insert({
        name: newBuyerName.trim(),
        email: newBuyerEmail.trim() || null,
        phone: newBuyerPhone.trim() || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setBuyers([...buyers, data])
      setSelectedBuyerId(data.id)
      setIsAddingBuyer(false)
      setNewBuyerName("")
      setNewBuyerEmail("")
      setNewBuyerPhone("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBuyerId || !salePrice) return

    setIsLoading(true)
    const success = await onSubmit(selectedBuyerId, Number.parseFloat(salePrice))
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
            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input
                id="buyerName"
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                placeholder="Enter buyer name"
              />
            </div>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddingBuyer(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddBuyer} disabled={!newBuyerName.trim()} className="flex-1">
                Add Buyer
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="buyer">Buyer *</Label>
                <div className="flex gap-2">
                  <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setIsAddingBuyer(true)}>
                    New
                  </Button>
                </div>
              </div>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedBuyerId || !salePrice}>
                {isLoading ? "Saving..." : "Mark for Sale"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
