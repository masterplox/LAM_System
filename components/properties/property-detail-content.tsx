"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { AlertTriangle, ArrowLeft, CreditCard, DollarSign, FileText, Grid3X3, Pencil, Plus, Ruler, Trash2, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AllDocumentsView } from "./all-documents-view"
import { DeleteSubdivisionDialog } from "./delete-subdivision-dialog"
import { DocumentsManager } from "./documents-manager"
import { HoldDialog } from "./hold-dialog"
import { PaymentsDialog } from "./payments-dialog"
import type { Property } from "./properties-content"
import { RecallDialog } from "./recall-dialog"
import { SaleDialog, type Buyer } from "./sale-dialog"
import { SubdivisionDialog, type SubdivisionFormData } from "./subdivision-dialog"

export interface Subdivision {
  id: string
  property_id: string
  user_id: string
  title: string
  description: string | null
  status: "on_hold" | "available" | "mortgage" | "sold" | "paid_in_full" | "recalled"
  sale_price: number
  buyer_id: string | null
  buyer?: Buyer | null
  created_at: string
  updated_at: string
  // Phase 1: Basic lot information
  lot_number?: string | null
  surveyor_plan_number?: string | null
  registration_number?: string | null
  mutation_number?: string | null
  // Phase 1: Physical dimensions
  acres?: number | null
  length?: number | null
  width?: number | null
  // Phase 1: Owner information (added later)
  owner_first_name?: string | null
  owner_middle_name?: string | null
  owner_last_name?: string | null
  title_nes_number?: string | null
  submission_date?: string | null
  // Phase 1: Hold/release functionality
  hold_until_date?: string | null
  hold_amount?: number | null
  // Phase 1: Payment type
  payment_type?: "full" | "mortgage" | "installment"
  // Phase 2: Interest and payment plans
  payment_plan_type?: "full" | "mortgage" | "hold"
  daily_interest_rate?: number | null
  interest_grace_period_days?: number | null
  last_payment_date?: string | null
  total_interest_charged?: number | null
  recall_date?: string | null
  recall_reason?: string | null
}

interface ExtendedProperty extends Property {
  status: "available" | "pending" | "sold"
  sale_price: number
  buyer_id: string | null
  buyer?: Buyer | null
}

interface PropertyDetailContentProps {
  property: ExtendedProperty
  initialSubdivisions: Subdivision[]
}

export function PropertyDetailContent({ property: initialProperty, initialSubdivisions }: PropertyDetailContentProps) {
  const [property, setProperty] = useState<ExtendedProperty>(initialProperty)
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>(initialSubdivisions)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSubdivision, setEditingSubdivision] = useState<Subdivision | null>(null)
  const [deletingSubdivision, setDeletingSubdivision] = useState<Subdivision | null>(null)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false)
  const [subdivisionForSale, setSubdivisionForSale] = useState<Subdivision | null>(null)
  const [subdivisionForPayments, setSubdivisionForPayments] = useState<Subdivision | null>(null)
  const [subdivisionForHold, setSubdivisionForHold] = useState<Subdivision | null>(null)
  const [subdivisionForRecall, setSubdivisionForRecall] = useState<Subdivision | null>(null)
  const [propertyTotalPaid, setPropertyTotalPaid] = useState(0)
  const [paymentCount, setPaymentCount] = useState(0)
  const [subdivisionPaymentCounts, setSubdivisionPaymentCounts] = useState<Record<string, number>>({})
  const [subdivisionTotalPaid, setSubdivisionTotalPaid] = useState<Record<string, number>>({})
  const router = useRouter()

  const totalSalePrice = subdivisions.reduce((sum, s) => sum + Number(s.sale_price || 0), 0)
  const isPropertySold = property.status === "sold"

  // Update property and subdivisions when initial data changes (e.g., when navigating back)
  useEffect(() => {
    setProperty(initialProperty)
    setSubdivisions(initialSubdivisions)
  }, [initialProperty, initialSubdivisions])

  // Fetch property payments on mount
  useEffect(() => {
    fetchPropertyPayments()
    fetchPaymentCount()
  }, [property.id])

  // Fetch subdivision payment counts when subdivisions change
  useEffect(() => {
    fetchSubdivisionPaymentCounts()
  }, [subdivisions])

  // Fetch subdivision payment counts when subdivisions change
  useEffect(() => {
    fetchSubdivisionPaymentCounts()
  }, [subdivisions])

  const fetchPropertyPayments = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("payments").select("amount").eq("property_id", property.id)

    if (data) {
      const total = data.reduce((sum, p) => sum + Number(p.amount), 0)
      setPropertyTotalPaid(total)
    }
  }

  const fetchPaymentCount = async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("property_id", property.id)

    setPaymentCount(count || 0)
  }

  const fetchSubdivisionPaymentCounts = async () => {
    const supabase = createClient()
    const counts: Record<string, number> = {}
    const totals: Record<string, number> = {}

    await Promise.all(
      subdivisions.map(async (subdivision) => {
        const { count } = await supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("subdivision_id", subdivision.id)

        counts[subdivision.id] = count || 0

        // Fetch payments with principal_amount for accurate balance calculation
        // For mortgage payments, we need to use principal_amount, not total amount
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, principal_amount")
          .eq("subdivision_id", subdivision.id)

        if (payments) {
          // Use principal_amount if available (for mortgage payments), otherwise use amount
          totals[subdivision.id] = payments.reduce(
            (sum, p) => sum + Number(p.principal_amount !== null && p.principal_amount !== undefined ? p.principal_amount : p.amount),
            0
          )
        } else {
          totals[subdivision.id] = 0
        }
      }),
    )

    setSubdivisionPaymentCounts(counts)
    setSubdivisionTotalPaid(totals)
  }

  const handleAddSubdivision = async (formData: SubdivisionFormData) => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("No authenticated user found")
      return false
    }

    const { data, error } = await supabase
      .from("subdivisions")
      .insert({
        title: formData.title,
        description: formData.description || null,
        sale_price: formData.sale_price || 0,
        lot_number: formData.lot_number || null,
        surveyor_plan_number: formData.surveyor_plan_number || null,
        registration_number: formData.registration_number || null,
        mutation_number: formData.mutation_number || null,
        acres: formData.acres || null,
        length: formData.length || null,
        width: formData.width || null,
        owner_first_name: formData.owner_first_name || null,
        owner_middle_name: formData.owner_middle_name || null,
        owner_last_name: formData.owner_last_name || null,
        title_nes_number: formData.title_nes_number || null,
        submission_date: formData.submission_date || null,
        buyer_id: formData.buyer_id || null,
        property_id: property.id,
        user_id: user.id,
        status: "available",
        payment_type: "full",
      })
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error adding subdivision:", error.message)
      return false
    }

    setSubdivisions([data, ...subdivisions])
    return true
  }

  const handleEditSubdivision = async (formData: SubdivisionFormData) => {
    if (!editingSubdivision) return false

    const supabase = createClient()
    const { data, error } = await supabase
      .from("subdivisions")
      .update({
        title: formData.title,
        description: formData.description || null,
        sale_price: formData.sale_price || editingSubdivision.sale_price || 0,
        lot_number: formData.lot_number || null,
        surveyor_plan_number: formData.surveyor_plan_number || null,
        registration_number: formData.registration_number || null,
        mutation_number: formData.mutation_number || null,
        acres: formData.acres || null,
        length: formData.length || null,
        width: formData.width || null,
        owner_first_name: formData.owner_first_name || null,
        owner_middle_name: formData.owner_middle_name || null,
        owner_last_name: formData.owner_last_name || null,
        title_nes_number: formData.title_nes_number || null,
        submission_date: formData.submission_date || null,
        buyer_id: formData.buyer_id || null,
      })
      .eq("id", editingSubdivision.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error updating subdivision:", error)
      return false
    }

    setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
    return true
  }

  const handleDeleteSubdivision = async () => {
    if (!deletingSubdivision) return

    const supabase = createClient()
    const { error } = await supabase.from("subdivisions").delete().eq("id", deletingSubdivision.id)

    if (error) {
      console.error("Error deleting subdivision:", error)
      return
    }

    setSubdivisions(subdivisions.filter((s) => s.id !== deletingSubdivision.id))
    setDeletingSubdivision(null)
  }

  const handleSubdivisionSale = async (
    buyerId: string,
    salePrice: number,
    paymentPlan: "full" | "mortgage" | "hold",
    interestRate?: number,
    gracePeriod?: number,
    holdAmount?: number,
    holdUntilDate?: string,
  ) => {
    if (!subdivisionForSale) return false

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    // Determine status and payment type based on payment plan
    let newStatus: "on_hold" | "available" | "mortgage" | "sold" | "paid_in_full" | "recalled"
    let paymentType: "full" | "mortgage" | "installment"

    if (paymentPlan === "full") {
      newStatus = "sold"
      paymentType = "full"
    } else if (paymentPlan === "mortgage") {
      newStatus = "mortgage"
      paymentType = "mortgage"
    } else {
      // hold
      newStatus = "on_hold"
      paymentType = "installment"
    }

    const updateData: any = {
      buyer_id: buyerId,
      sale_price: salePrice,
      status: newStatus,
      payment_type: paymentType,
      payment_plan_type: paymentPlan,
    }

    // Add interest rate if provided (mortgage plan)
    if (paymentPlan === "mortgage" && interestRate !== undefined) {
      updateData.daily_interest_rate = interestRate
    }

    // Add grace period
    if (gracePeriod !== undefined) {
      updateData.interest_grace_period_days = gracePeriod
    }

    // Add hold information
    if (paymentPlan === "hold") {
      if (holdAmount !== undefined) {
        updateData.hold_amount = holdAmount
      }
      if (holdUntilDate) {
        updateData.hold_until_date = holdUntilDate
      }
    }

    const { data, error } = await supabase
      .from("subdivisions")
      .update(updateData)
      .eq("id", subdivisionForSale.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("Error updating subdivision sale:", error)
      return false
    }

    // If it's a hold, create the initial payment
    if (paymentPlan === "hold" && holdAmount !== undefined && holdAmount > 0) {
      await supabase.from("payments").insert({
        user_id: user.id,
        subdivision_id: subdivisionForSale.id,
        buyer_id: buyerId,
        amount: holdAmount,
        payment_date: new Date().toISOString().split("T")[0],
        notes: `Hold deposit - Hold until ${holdUntilDate}`,
        principal_amount: holdAmount,
      })
    }

    // If it's full payment, create the full payment record
    if (paymentPlan === "full") {
      await supabase.from("payments").insert({
        user_id: user.id,
        subdivision_id: subdivisionForSale.id,
        buyer_id: buyerId,
        amount: salePrice,
        payment_date: new Date().toISOString().split("T")[0],
        notes: "Full payment",
        principal_amount: salePrice,
      })

      // Update status to paid_in_full
      await supabase
        .from("subdivisions")
        .update({ status: "paid_in_full" })
        .eq("id", subdivisionForSale.id)
    }

    setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
    return true
  }

  const handlePlaceHold = async (buyerId: string, holdAmount: number, holdUntilDate: string, notes?: string) => {
    if (!subdivisionForHold) return false

    const supabase = createClient()
    
    // Create a payment entry for the hold amount
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    // Update subdivision to on_hold status
    const { data: subdivisionData, error: subError } = await supabase
      .from("subdivisions")
      .update({
        buyer_id: buyerId,
        status: "on_hold",
        hold_until_date: holdUntilDate,
        hold_amount: holdAmount,
      })
      .eq("id", subdivisionForHold.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (subError) {
      console.error("Error placing hold:", subError)
      return false
    }

    // Create payment entry for hold amount
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        subdivision_id: subdivisionForHold.id,
        buyer_id: buyerId,
        amount: holdAmount,
        payment_date: new Date().toISOString().split("T")[0],
        notes: notes || `Hold deposit - Hold until ${holdUntilDate}`,
      })

    if (paymentError) {
      console.error("Error creating hold payment:", paymentError)
      // Rollback subdivision update? Or just log it
    }

    if (subdivisionData) {
      setSubdivisions(subdivisions.map((s) => (s.id === subdivisionData.id ? subdivisionData : s)))
    }

    return true
  }

  const handleRecall = async (reason: string) => {
    if (!subdivisionForRecall) return false

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return false

    console.log("[Recall] Starting recall process for subdivision:", subdivisionForRecall.id)

    // Get current buyer information and payment totals before clearing
    const currentBuyerId = subdivisionForRecall.buyer_id
    const currentBuyer = subdivisionForRecall.buyer
    const salePrice = Number(subdivisionForRecall.sale_price || 0)
    const totalPaid = subdivisionTotalPaid[subdivisionForRecall.id] || 0

    console.log("[Recall] Current state:", {
      buyerId: currentBuyerId,
      buyerName: currentBuyer?.name,
      salePrice,
      totalPaid,
    })

    // Get all payment IDs for this subdivision to delete related documents and receipts
    const { data: payments } = await supabase
      .from("payments")
      .select("id")
      .eq("subdivision_id", subdivisionForRecall.id)

    const paymentIds = payments?.map((p) => p.id) || []
    console.log("[Recall] Found payments to delete:", paymentIds.length)

    // Get all receipt IDs related to these payments
    let receiptIds: string[] = []
    if (paymentIds.length > 0) {
      const { data: receipts } = await supabase
        .from("receipts")
        .select("id")
        .in("payment_id", paymentIds)
      receiptIds = receipts?.map((r) => r.id) || []
      console.log("[Recall] Found receipts to delete:", receiptIds.length)
    }

    // Get all document IDs related to this subdivision and its payments
    const documentQueries = [
      supabase.from("documents").select("id").eq("subdivision_id", subdivisionForRecall.id),
    ]

    if (paymentIds.length > 0) {
      documentQueries.push(
        supabase.from("documents").select("id").in("payment_id", paymentIds),
      )
    }

    const documentResults = await Promise.all(documentQueries)
    const allDocumentIds = documentResults.flatMap((result) => result.data?.map((d) => d.id) || [])
    console.log("[Recall] Found documents to delete:", allDocumentIds.length)

    // 1. Save recall history before clearing data
    const recallHistoryData = {
      subdivision_id: subdivisionForRecall.id,
      user_id: user.id,
      buyer_id: currentBuyerId,
      recall_reason: reason,
      sale_price: salePrice > 0 ? salePrice : null,
      total_paid: totalPaid,
      hold_amount: subdivisionForRecall.hold_amount || null,
      hold_until_date: subdivisionForRecall.hold_until_date || null,
      payment_plan_type: subdivisionForRecall.payment_plan_type || null,
      buyer_name: currentBuyer?.name || null,
      buyer_email: currentBuyer?.email || null,
      buyer_phone: currentBuyer?.phone || null,
    }

    console.log("[Recall] Saving recall history:", recallHistoryData)
    const { error: historyError } = await supabase
      .from("subdivision_recall_history")
      .insert(recallHistoryData)

    if (historyError) {
      console.error("[Recall] Error saving recall history:", historyError)
      // Continue anyway - don't fail the recall if history save fails
    } else {
      console.log("[Recall] Recall history saved successfully")
    }

    // 2. Delete receipt emails first (foreign key to receipts)
    if (receiptIds.length > 0) {
      console.log("[Recall] Deleting receipt emails...")
      const { error: receiptEmailError } = await supabase
        .from("receipt_emails")
        .delete()
        .in("receipt_id", receiptIds)
      if (receiptEmailError) {
        console.error("[Recall] Error deleting receipt emails:", receiptEmailError)
      } else {
        console.log("[Recall] Receipt emails deleted successfully")
      }
    }

    // 3. Delete receipts (foreign key to payments)
    if (receiptIds.length > 0) {
      console.log("[Recall] Deleting receipts...")
      const { error: receiptError } = await supabase.from("receipts").delete().in("id", receiptIds)
      if (receiptError) {
        console.error("[Recall] Error deleting receipts:", receiptError)
      } else {
        console.log("[Recall] Receipts deleted successfully")
      }
    }

    // 4. Delete documents related to subdivision and payments (before deleting payments)
    if (allDocumentIds.length > 0) {
      console.log("[Recall] Deleting documents...")
      const { error: docError } = await supabase.from("documents").delete().in("id", allDocumentIds)
      if (docError) {
        console.error("[Recall] Error deleting documents:", docError)
      } else {
        console.log("[Recall] Documents deleted successfully")
      }
    }

    // 5. Delete all payments for this subdivision
    if (paymentIds.length > 0) {
      console.log("[Recall] Deleting payments...")
      const { error: paymentError } = await supabase
        .from("payments")
        .delete()
        .eq("subdivision_id", subdivisionForRecall.id)
      if (paymentError) {
        console.error("[Recall] Error deleting payments:", paymentError)
      } else {
        console.log("[Recall] Payments deleted successfully")
      }
    }

    // 6. Reset subdivision to available status and clear all sale-related fields
    console.log("[Recall] Resetting subdivision to available...")
    const { data, error } = await supabase
      .from("subdivisions")
      .update({
        status: "available",
        buyer_id: null,
        sale_price: 0,
        hold_until_date: null,
        hold_amount: null,
        payment_type: "full",
        payment_plan_type: null,
        daily_interest_rate: null,
        interest_grace_period_days: null,
        last_payment_date: null,
        total_interest_charged: null,
        recall_date: null,
        recall_reason: null,
      })
      .eq("id", subdivisionForRecall.id)
      .select(`*, buyer:buyers(*)`)
      .single()

    if (error) {
      console.error("[Recall] Error resetting subdivision:", error)
      return false
    }

    console.log("[Recall] Subdivision reset successfully to available status")

    // 7. Refresh subdivision data and payment counts
    if (data) {
      setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
      // Refresh payment counts
      fetchSubdivisionPaymentCounts()
      console.log("[Recall] Subdivision list and payment counts refreshed")
    }

    return true
  }

  const handlePropertyPaymentChange = async (totalPaid: number) => {
    setPropertyTotalPaid(totalPaid)
    fetchPaymentCount()

    if (totalPaid >= Number(property.sale_price) && property.status === "pending") {
      const supabase = createClient()
      const { data } = await supabase
        .from("properties")
        .update({ status: "sold" })
        .eq("id", property.id)
        .select(`*, buyer:buyers(*)`)
        .single()

      if (data) {
        setProperty(data)
      }
    }
  }

  const handleSubdivisionPaymentChange = async (totalPaid: number, subdivisionId: string, salePrice: number) => {
    const subdivision = subdivisions.find((s) => s.id === subdivisionId)
    if (!subdivision) return

    // Refresh payment count for this subdivision
    const supabase = createClient()
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("subdivision_id", subdivisionId)

    setSubdivisionPaymentCounts((prev) => ({
      ...prev,
      [subdivisionId]: count || 0,
    }))

    // Update total paid amount
    setSubdivisionTotalPaid((prev) => ({
      ...prev,
      [subdivisionId]: totalPaid,
    }))

    // Check if fully paid
    if (totalPaid >= salePrice) {
      const { data } = await supabase
        .from("subdivisions")
        .update({ status: "paid_in_full" })
        .eq("id", subdivisionId)
        .select(`*, buyer:buyers(*)`)
        .single()

      if (data) {
        setSubdivisions(subdivisions.map((s) => (s.id === data.id ? data : s)))
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string, subdivisionId?: string, salePrice?: number) => {
    // Check if this subdivision has pending payments
    const hasPendingPayment = subdivisionId && salePrice !== undefined && (() => {
      const totalPaid = subdivisionTotalPaid[subdivisionId] || 0
      return (status === "sold" || status === "mortgage") && !(totalPaid >= salePrice) && totalPaid > 0
    })()

    // Check if fully paid
    const isFullyPaid = subdivisionId && salePrice !== undefined && (() => {
      const totalPaid = subdivisionTotalPaid[subdivisionId] || 0
      return totalPaid >= salePrice
    })()

    switch (status) {
      case "on_hold":
        return <Badge className="bg-amber-500 text-white">On Hold</Badge>
      case "available":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Available</Badge>
      case "mortgage":
        // If fully paid, show "Paid in Full"
        if (isFullyPaid) {
          return <Badge className="bg-green-700 text-white">Paid in Full</Badge>
        }
        // Show mortgage badge - pending payment badge will be added separately
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Mortgage</Badge>
      case "sold":
        // If fully paid, show "Paid in Full"
        if (isFullyPaid) {
          return <Badge className="bg-green-700 text-white">Paid in Full</Badge>
        }
        return <Badge className="bg-green-600 text-white">Sold</Badge>
      case "paid_in_full":
        return <Badge className="bg-green-700 text-white">Paid in Full</Badge>
      case "recalled":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Recalled</Badge>
      default:
        return <Badge variant="outline">Available</Badge>
    }
  }

  const getPendingPaymentBadge = (status: string, subdivisionId?: string, salePrice?: number) => {
    if (!subdivisionId || salePrice === undefined) return null
    
    const totalPaid = subdivisionTotalPaid[subdivisionId] || 0
    const isFullyPaid = totalPaid >= salePrice
    const hasPendingPayment = (status === "sold" || status === "mortgage") && !isFullyPaid && totalPaid > 0
    
    if (hasPendingPayment) {
      return <Badge className="bg-yellow-500 text-white">Pending Payment</Badge>
    }
    
    return null
  }

  const propertyBalance = Number(property.sale_price) - propertyTotalPaid

  return (
    <div className="p-4 pt-6 lg:p-8">
      {/* Back Button */}
      <Button variant="ghost" className="mb-4" onClick={() => router.push("/dashboard/properties")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Properties
      </Button>

      {/* Property Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{property.title}</h1>
            {getStatusBadge(property.status)}
          </div>
          <p className="text-muted-foreground">{property.description || "No description"}</p>
          {property.buyer && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              Buyer: <span className="font-medium">{property.buyer.name}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(property.status === "pending" || property.status === "sold") && (
            <Button variant="outline" onClick={() => setIsPaymentsDialogOpen(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Payments
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {paymentCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Property Sale Info */}
      {property.status !== "available" && (
        <Card className="mb-6">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Sale Price</p>
              <p className="text-lg font-semibold">{formatCurrency(Number(property.sale_price))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(propertyTotalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`text-lg font-semibold ${propertyBalance > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(propertyBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(property.status)}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subdivisions</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subdivisions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sale Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalePrice)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subdivisions" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="subdivisions" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Subdivisions
          </TabsTrigger>
          <TabsTrigger value="all-documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subdivisions">
          {/* Subdivisions Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Subdivisions</h2>
              <p className="text-sm text-muted-foreground">Manage parcels within this property</p>
            </div>
            {!isPropertySold && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subdivision
              </Button>
            )}
          </div>

          {/* Subdivisions List */}
          {subdivisions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4">
                  <Grid3X3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No subdivisions yet</h3>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Start dividing this property into smaller parcels.
                </p>
                {!isPropertySold && (
                  <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Subdivision
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subdivisions.map((subdivision) => {
                const isSubSold = subdivision.status === "sold" || subdivision.status === "paid_in_full"
                const isSubPending = subdivision.status === "mortgage" || subdivision.status === "sold"
                const isOnHold = subdivision.status === "on_hold"
                
                // Calculate remaining balance for pending payments
                const totalPaid = subdivisionTotalPaid[subdivision.id] || 0
                const salePrice = Number(subdivision.sale_price || 0)
                const remainingBalance = salePrice - totalPaid
                const isPendingPayment = (subdivision.status === "sold" || subdivision.status === "mortgage") && 
                                         !(totalPaid >= salePrice) && 
                                         totalPaid > 0

                return (
                  <Card key={subdivision.id} className="group relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-8">
                          <div className="mb-1 flex items-center gap-2 flex-wrap">
                            <CardTitle className="line-clamp-1 text-lg">{subdivision.title}</CardTitle>
                            {getStatusBadge(subdivision.status, subdivision.id, Number(subdivision.sale_price))}
                            {getPendingPaymentBadge(subdivision.status, subdivision.id, Number(subdivision.sale_price))}
                          </div>
                        </div>
                        {!isPropertySold && !isSubSold && (
                          <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingSubdivision(subdivision)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingSubdivision(subdivision)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {subdivision.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="mb-3 flex items-center justify-between">
                        {subdivision.sale_price > 0 ? (
                          <span className="text-lg font-semibold text-primary">
                            {formatCurrency(Number(subdivision.sale_price))}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No sale price set</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(subdivision.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      

                      {/* Lot Information */}
                      {subdivision.lot_number && (
                        <div className="mb-2 space-y-1 text-xs text-muted-foreground">
                          <p>Lot #{subdivision.lot_number}</p>
                        </div>
                      )}

                      {(subdivision.buyer || property.buyer) && (
                        <p className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {subdivision.buyer?.name || property.buyer?.name}
                        </p>
                      )}
{/* Dimensions */}
{(subdivision.acres || subdivision.length || subdivision.width) && (
                        <div className="mb-3 rounded-lg border bg-muted/30 p-2">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Ruler className="h-3.5 w-3.5" />
                            <span>Dimensions</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            {subdivision.acres && (
                              <div>
                                <span className="text-muted-foreground">Acres: </span>
                                <span className="font-medium">{Number(subdivision.acres).toFixed(4)}</span>
                              </div>
                            )}
                            {subdivision.length && (
                              <div>
                                <span className="text-muted-foreground">Length: </span>
                                <span className="font-medium">{Number(subdivision.length).toFixed(2)}</span>
                              </div>
                            )}
                            {subdivision.width && (
                              <div>
                                <span className="text-muted-foreground">Width: </span>
                                <span className="font-medium">{Number(subdivision.width).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Hold Information */}
                      {isOnHold && subdivision.hold_until_date && (
                        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs">
                          <p className="font-medium text-amber-900">On Hold</p>
                          <p className="text-amber-700">
                            Until: {new Date(subdivision.hold_until_date).toLocaleDateString()}
                          </p>
                          {subdivision.hold_amount && (
                            <p className="text-amber-700">Amount: {formatCurrency(Number(subdivision.hold_amount))}</p>
                          )}
                          {(() => {
                            const daysRemaining = Math.ceil(
                              (new Date(subdivision.hold_until_date).getTime() - new Date().getTime()) /
                                (1000 * 60 * 60 * 24),
                            )
                            return (
                              <p className={`font-medium ${daysRemaining <= 7 ? "text-red-700" : "text-amber-700"}`}>
                                {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expired"}
                              </p>
                            )
                          })()}
                        </div>
                      )}

                      {(isSubPending || isSubSold) && (
                        <div className="mb-3 space-y-1">
                          <p className="text-sm">
                            Sale: <span className="font-medium">{formatCurrency(Number(subdivision.sale_price))}</span>
                            {subdivision.payment_type && subdivision.payment_type !== "full" && (
                              <span className="ml-2 text-xs text-muted-foreground">({subdivision.payment_type})</span>
                            )}
                          </p>
                          {isPendingPayment && (
                            <p className="text-sm font-medium text-orange-600">
                              Balance: <span>{formatCurrency(remainingBalance)}</span>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <DocumentsManager subdivisionId={subdivision.id} triggerLabel="Docs" />
                        {!isPropertySold && subdivision.status === "available" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => setSubdivisionForHold(subdivision)}
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Hold
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => setSubdivisionForSale(subdivision)}
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Sell
                            </Button>
                          </>
                        )}
                        {isOnHold && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => setSubdivisionForSale(subdivision)}
                            >
                              <DollarSign className="mr-1 h-3 w-3" />
                              Sell
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent text-orange-600 hover:text-orange-700"
                              onClick={() => setSubdivisionForRecall(subdivision)}
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Recall
                            </Button>
                          </>
                        )}
                        {(isSubPending || isSubSold) && !isOnHold && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => setSubdivisionForPayments(subdivision)}
                          >
                            <CreditCard className="mr-1 h-3 w-3" />
                            Payments
                            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                              {subdivisionPaymentCounts[subdivision.id] || 0}
                            </Badge>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-documents">
          <AllDocumentsView propertyId={property.id} subdivisions={subdivisions} />
        </TabsContent>
      </Tabs>

      {/* Add Subdivision Dialog */}
      <SubdivisionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddSubdivision}
        title="Add Subdivision"
        description="Create a new subdivision for this property."
      />

      {/* Edit Subdivision Dialog */}
      <SubdivisionDialog
        open={!!editingSubdivision}
        onOpenChange={(open) => !open && setEditingSubdivision(null)}
        onSubmit={handleEditSubdivision}
        title="Edit Subdivision"
        description="Update the subdivision details."
        initialData={editingSubdivision ? {
          title: editingSubdivision.title,
          description: editingSubdivision.description || "",
          sale_price: editingSubdivision.sale_price,
          lot_number: editingSubdivision.lot_number || undefined,
          surveyor_plan_number: editingSubdivision.surveyor_plan_number || undefined,
          registration_number: editingSubdivision.registration_number || undefined,
          mutation_number: editingSubdivision.mutation_number || undefined,
          acres: editingSubdivision.acres || undefined,
          length: editingSubdivision.length || undefined,
          width: editingSubdivision.width || undefined,
          owner_first_name: editingSubdivision.owner_first_name || undefined,
          owner_middle_name: editingSubdivision.owner_middle_name || undefined,
          owner_last_name: editingSubdivision.owner_last_name || undefined,
          title_nes_number: editingSubdivision.title_nes_number || undefined,
          submission_date: editingSubdivision.submission_date || undefined,
          buyer_id: editingSubdivision.buyer_id || undefined,
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteSubdivisionDialog
        open={!!deletingSubdivision}
        onOpenChange={(open) => !open && setDeletingSubdivision(null)}
        onConfirm={handleDeleteSubdivision}
        subdivisionTitle={deletingSubdivision?.title || ""}
      />

      {/* Property Payments Dialog */}
      <PaymentsDialog
        open={isPaymentsDialogOpen}
        onOpenChange={setIsPaymentsDialogOpen}
        propertyId={property.id}
        propertyTitle={property.title}
        buyerId={property.buyer_id || undefined}
        buyer={property.buyer}
        salePrice={Number(property.sale_price)}
        onPaymentsChange={handlePropertyPaymentChange}
      />

      {/* Subdivision Hold Dialog */}
      <HoldDialog
        open={!!subdivisionForHold}
        onOpenChange={(open) => !open && setSubdivisionForHold(null)}
        subdivisionId={subdivisionForHold?.id || ""}
        subdivisionTitle={subdivisionForHold?.title || ""}
        currentBuyerId={(() => {
          const buyerId = subdivisionForHold?.buyer_id || subdivisionForHold?.buyer?.id || null
          console.log("[PropertyDetail] HoldDialog - Subdivision buyer data:", {
            subdivisionId: subdivisionForHold?.id,
            subdivisionTitle: subdivisionForHold?.title,
            buyer_id: subdivisionForHold?.buyer_id,
            buyer_object: subdivisionForHold?.buyer,
            buyer_id_from_object: subdivisionForHold?.buyer?.id,
            finalBuyerId: buyerId,
          })
          return buyerId
        })()}
        onSubmit={handlePlaceHold}
      />

      {/* Subdivision Recall Dialog */}
      <RecallDialog
        open={!!subdivisionForRecall}
        onOpenChange={(open) => !open && setSubdivisionForRecall(null)}
        subdivisionId={subdivisionForRecall?.id || ""}
        subdivisionTitle={subdivisionForRecall?.title || ""}
        holdUntilDate={subdivisionForRecall?.hold_until_date || null}
        onRecall={handleRecall}
      />

      {/* Subdivision Sale Dialog */}
      <SaleDialog
        open={!!subdivisionForSale}
        onOpenChange={(open) => !open && setSubdivisionForSale(null)}
        onSubmit={handleSubdivisionSale}
        title="Record Sale Agreement"
        description={`Record a sale agreement for "${subdivisionForSale?.title}". The lot will be marked as sold once payments are complete.`}
        initialBuyerId={(() => {
          const buyerId = subdivisionForSale?.buyer_id || subdivisionForSale?.buyer?.id || undefined
          console.log("[PropertyDetail] SaleDialog - Subdivision buyer data:", {
            subdivisionId: subdivisionForSale?.id,
            subdivisionTitle: subdivisionForSale?.title,
            buyer_id: subdivisionForSale?.buyer_id,
            buyer_object: subdivisionForSale?.buyer,
            buyer_id_from_object: subdivisionForSale?.buyer?.id,
            finalBuyerId: buyerId,
          })
          return buyerId
        })()}
        initialSalePrice={Number(subdivisionForSale?.sale_price) || undefined}
        disabled={isPropertySold}
        disabledMessage="This subdivision cannot be sold individually because the entire property has been sold."
      />

      {/* Subdivision Payments Dialog */}
      <PaymentsDialog
        open={!!subdivisionForPayments}
        onOpenChange={(open) => {
          if (!open) {
            setSubdivisionForPayments(null)
            // Refresh subdivision payment data when dialog closes
            fetchSubdivisionPaymentCounts()
          }
        }}
        subdivisionId={subdivisionForPayments?.id}
        subdivisionTitle={subdivisionForPayments?.title}
        propertyTitle={property.title}
        buyerId={subdivisionForPayments?.buyer_id || property.buyer_id || undefined}
        buyer={subdivisionForPayments?.buyer || property.buyer}
        salePrice={Number(subdivisionForPayments?.sale_price || 0)}
        onPaymentsChange={(totalPaid) =>
          subdivisionForPayments &&
          handleSubdivisionPaymentChange(
            totalPaid,
            subdivisionForPayments.id,
            Number(subdivisionForPayments.sale_price),
          )
        }
      />
    </div>
  )
}
