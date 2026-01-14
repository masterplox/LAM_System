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

interface SubdivisionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SubdivisionFormData) => Promise<boolean>
  title: string
  description: string
  initialData?: Partial<SubdivisionFormData>
}

export interface SubdivisionFormData {
  title: string
  description: string
  sale_price?: number
  lot_number?: string
  surveyor_plan_number?: string
  registration_number?: string
  mutation_number?: string
  acres?: number
  length?: number
  width?: number
  // Owner info (can be added later)
  owner_first_name?: string
  owner_middle_name?: string
  owner_last_name?: string
  title_nes_number?: string
  submission_date?: string
  buyer_id?: string
}

export function SubdivisionDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  initialData,
}: SubdivisionDialogProps) {
  const [subdivisionTitle, setSubdivisionTitle] = useState(initialData?.title || "")
  const [subdivisionDescription, setSubdivisionDescription] = useState(initialData?.description || "")
  const [salePrice, setSalePrice] = useState(initialData?.sale_price?.toString() || "")
  const [lotNumber, setLotNumber] = useState(initialData?.lot_number || "")
  const [surveyorPlanNumber, setSurveyorPlanNumber] = useState(initialData?.surveyor_plan_number || "")
  const [registrationNumber, setRegistrationNumber] = useState(initialData?.registration_number || "")
  const [mutationNumber, setMutationNumber] = useState(initialData?.mutation_number || "")
  const [acres, setAcres] = useState(initialData?.acres?.toString() || "")
  const [length, setLength] = useState(initialData?.length?.toString() || "")
  const [width, setWidth] = useState(initialData?.width?.toString() || "")
  // Owner info fields (optional, can be added later)
  const [selectedBuyerId, setSelectedBuyerId] = useState("")
  const [isAddingBuyer, setIsAddingBuyer] = useState(false)
  const [newBuyerFirstName, setNewBuyerFirstName] = useState("")
  const [newBuyerMiddleName, setNewBuyerMiddleName] = useState("")
  const [newBuyerLastName, setNewBuyerLastName] = useState("")
  const [newBuyerEmail, setNewBuyerEmail] = useState("")
  const [newBuyerPhone, setNewBuyerPhone] = useState("")
  const [ownerFirstName, setOwnerFirstName] = useState(initialData?.owner_first_name || "")
  const [ownerMiddleName, setOwnerMiddleName] = useState(initialData?.owner_middle_name || "")
  const [ownerLastName, setOwnerLastName] = useState(initialData?.owner_last_name || "")
  const [titleNesNumber, setTitleNesNumber] = useState(initialData?.title_nes_number || "")
  const [submissionDate, setSubmissionDate] = useState(initialData?.submission_date || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOwnerFields, setShowOwnerFields] = useState(false)


  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open && initialData) {
      setSubdivisionTitle(initialData.title || "")
      setSubdivisionDescription(initialData.description || "")
      setSalePrice(initialData.sale_price?.toString() || "")
      setLotNumber(initialData.lot_number || "")
      setSurveyorPlanNumber(initialData.surveyor_plan_number || "")
      setRegistrationNumber(initialData.registration_number || "")
      setMutationNumber(initialData.mutation_number || "")
      setAcres(initialData.acres?.toString() || "")
      setLength(initialData.length?.toString() || "")
      setWidth(initialData.width?.toString() || "")
      setOwnerFirstName(initialData.owner_first_name || "")
      setOwnerMiddleName(initialData.owner_middle_name || "")
      setOwnerLastName(initialData.owner_last_name || "")
      setTitleNesNumber(initialData.title_nes_number || "")
      setSubmissionDate(initialData.submission_date || "")
      setSelectedBuyerId(initialData.buyer_id || "")
      // Show owner fields by default when editing
      setShowOwnerFields(true)
      // Note: Buyer matching will be handled by the BuyerSelector component
    } else if (open && !initialData) {
      // Reset to defaults for new subdivision
      setSubdivisionTitle("")
      setSubdivisionDescription("")
      setSalePrice("")
      setLotNumber("")
      setSurveyorPlanNumber("")
      setRegistrationNumber("")
      setMutationNumber("")
      setAcres("")
      setLength("")
      setWidth("")
      setOwnerFirstName("")
      setOwnerMiddleName("")
      setOwnerLastName("")
      setTitleNesNumber("")
      setSubmissionDate("")
      setShowOwnerFields(false)
      setSelectedBuyerId("")
    }
  }, [open, initialData])

  const handleBuyerSelect = async (buyerId: string) => {
    setSelectedBuyerId(buyerId)
    
    // Fetch buyer details to parse name
    const supabase = createClient()
    const { data: buyer } = await supabase
      .from("buyers")
      .select("*")
      .eq("id", buyerId)
      .single()

    if (buyer) {
      // Try to parse the buyer's name into first, middle, last
      const nameParts = buyer.name.trim().split(/\s+/)
      if (nameParts.length === 1) {
        setOwnerLastName(nameParts[0])
        setOwnerFirstName("")
        setOwnerMiddleName("")
      } else if (nameParts.length === 2) {
        setOwnerFirstName(nameParts[0])
        setOwnerLastName(nameParts[1])
        setOwnerMiddleName("")
      } else {
        setOwnerFirstName(nameParts[0])
        setOwnerMiddleName(nameParts.slice(1, -1).join(" "))
        setOwnerLastName(nameParts[nameParts.length - 1])
      }
      setShowOwnerFields(true)
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
      // Set selected buyer
      setSelectedBuyerId(data.id)
      
      // Populate owner fields from the new buyer
      setOwnerFirstName(newBuyerFirstName.trim())
      setOwnerMiddleName(newBuyerMiddleName.trim())
      setOwnerLastName(newBuyerLastName.trim())
      
      // Clear new buyer fields
      setNewBuyerFirstName("")
      setNewBuyerMiddleName("")
      setNewBuyerLastName("")
      setNewBuyerEmail("")
      setNewBuyerPhone("")
      
      // Hide the "new buyer" form and ensure owner fields section remains visible
      setIsAddingBuyer(false)
      // showOwnerFields should already be true if user clicked "Add Owner Info", but ensure it stays true
      if (!showOwnerFields) {
        setShowOwnerFields(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subdivisionTitle.trim()) return

    setIsSubmitting(true)
    const formData: SubdivisionFormData = {
      title: subdivisionTitle.trim(),
      description: subdivisionDescription.trim(),
      sale_price: salePrice ? Number.parseFloat(salePrice) : undefined,
      lot_number: lotNumber.trim() || undefined,
      surveyor_plan_number: surveyorPlanNumber.trim() || undefined,
      registration_number: registrationNumber.trim() || undefined,
      mutation_number: mutationNumber.trim() || undefined,
      acres: acres ? Number.parseFloat(acres) : undefined,
      length: length ? Number.parseFloat(length) : undefined,
      width: width ? Number.parseFloat(width) : undefined,
      owner_first_name: ownerFirstName.trim() || undefined,
      owner_middle_name: ownerMiddleName.trim() || undefined,
      owner_last_name: ownerLastName.trim() || undefined,
      title_nes_number: titleNesNumber.trim() || undefined,
      submission_date: submissionDate || undefined,
      buyer_id: selectedBuyerId || undefined,
    }
    const success = await onSubmit(formData)
    setIsSubmitting(false)

    if (success) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="subdivision-title">Title *</Label>
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
                  <Label htmlFor="subdivision-sale-price">Sale Price ($)</Label>
                  <Input
                    id="subdivision-sale-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Lot Information */}
            <div className="space-y-3 border-t pt-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Lot Information</h3>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="lot-number">Lot Number</Label>
                  <Input
                    id="lot-number"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Enter lot number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="surveyor-plan-number">Surveyor Plan Number</Label>
                    <Input
                      id="surveyor-plan-number"
                      value={surveyorPlanNumber}
                      onChange={(e) => setSurveyorPlanNumber(e.target.value)}
                      placeholder="Enter surveyor plan number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="registration-number">Registration Number</Label>
                    <Input
                      id="registration-number"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Enter registration number"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mutation-number">Mutation Number</Label>
                  <Input
                    id="mutation-number"
                    value={mutationNumber}
                    onChange={(e) => setMutationNumber(e.target.value)}
                    placeholder="Enter mutation number"
                  />
                </div>
              </div>
            </div>

            {/* Physical Dimensions */}
            <div className="space-y-3 border-t pt-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Physical Dimensions</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="acres">Acres</Label>
                  <Input
                    id="acres"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={acres}
                    onChange={(e) => setAcres(e.target.value)}
                    placeholder="0.0000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="length">Length</Label>
                  <Input
                    id="length"
                    type="number"
                    min="0"
                    step="0.01"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min="0"
                    step="0.01"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Owner Information (Optional - Can be added later) */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Owner Information (Optional)</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOwnerFields(!showOwnerFields)}
                >
                  {showOwnerFields ? "Hide" : "Add Owner Info"}
                </Button>
              </div>
              {showOwnerFields && (
                <div className="grid gap-3">
                  {!isAddingBuyer ? (
                    <>
                      <BuyerSelector
                        value={selectedBuyerId}
                        onValueChange={handleBuyerSelect}
                        onAddNew={() => setIsAddingBuyer(true)}
                        label="Owner/Buyer"
                        placeholder="Select a buyer"
                      />
                      {selectedBuyerId && (
                        <p className="text-xs text-muted-foreground">
                          Owner information will be automatically populated from the selected buyer.
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="title-nes-number">Title NES Number</Label>
                          <Input
                            id="title-nes-number"
                            value={titleNesNumber}
                            onChange={(e) => setTitleNesNumber(e.target.value)}
                            placeholder="Enter Title NES number"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="submission-date">Submission Date</Label>
                          <Input
                            id="submission-date"
                            type="date"
                            value={submissionDate}
                            onChange={(e) => setSubmissionDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 rounded-lg border p-4">
                      <h4 className="font-medium">Create New Buyer</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="new-buyer-first-name">First Name *</Label>
                          <Input
                            id="new-buyer-first-name"
                            value={newBuyerFirstName}
                            onChange={(e) => setNewBuyerFirstName(e.target.value)}
                            placeholder="First name"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-buyer-middle-name">Middle Name</Label>
                          <Input
                            id="new-buyer-middle-name"
                            value={newBuyerMiddleName}
                            onChange={(e) => setNewBuyerMiddleName(e.target.value)}
                            placeholder="Middle name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-buyer-last-name">Last Name *</Label>
                          <Input
                            id="new-buyer-last-name"
                            value={newBuyerLastName}
                            onChange={(e) => setNewBuyerLastName(e.target.value)}
                            placeholder="Last name"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="new-buyer-email">Email</Label>
                          <Input
                            id="new-buyer-email"
                            type="email"
                            value={newBuyerEmail}
                            onChange={(e) => setNewBuyerEmail(e.target.value)}
                            placeholder="Enter email (optional)"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new-buyer-phone">Phone</Label>
                          <Input
                            id="new-buyer-phone"
                            value={newBuyerPhone}
                            onChange={(e) => setNewBuyerPhone(e.target.value)}
                            placeholder="Enter phone (optional)"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
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
                          type="button"
                          onClick={handleAddBuyer}
                          disabled={!newBuyerFirstName.trim() || !newBuyerLastName.trim()}
                          className="flex-1"
                        >
                          Add Buyer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
