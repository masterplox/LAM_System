"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Plus, Receipt } from "lucide-react"
import { useEffect, useState } from "react"
import { DocumentsManager } from "./documents-manager"
import { InterestCalculator } from "./interest-calculator"
import { ReceiptDialog } from "./receipt-dialog"
import type { Buyer } from "./sale-dialog"

export interface Payment {
  id: string
  user_id: string
  property_id: string | null
  subdivision_id: string | null
  buyer_id: string | null
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
  buyer?: Buyer | null
  interest_amount?: number | null
  principal_amount?: number | null
  days_since_last_payment?: number | null
  interest_rate_used?: number | null
  grace_period_days?: number | null
}

interface PaymentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId?: string
  propertyTitle?: string
  subdivisionId?: string
  subdivisionTitle?: string
  buyerId?: string
  buyer?: Buyer | null
  salePrice: number
  onPaymentsChange: (totalPaid: number) => void
}

export function PaymentsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyTitle = "Property",
  subdivisionId,
  subdivisionTitle,
  buyerId,
  buyer,
  salePrice,
  onPaymentsChange,
}: PaymentsDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [newAmount, setNewAmount] = useState("")
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0])
  const [newNotes, setNewNotes] = useState("")
  const [sendEmailNow, setSendEmailNow] = useState(false)
  const [newPaymentEmail, setNewPaymentEmail] = useState(buyer?.email || "")
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)
  
  // Interest calculation state
  const [subdivisionData, setSubdivisionData] = useState<{
    daily_interest_rate: number | null
    interest_grace_period_days: number | null
    last_payment_date: string | null
    payment_plan_type: string | null
  } | null>(null)
  const [calculatedInterest, setCalculatedInterest] = useState(0)
  const [calculatedDays, setCalculatedDays] = useState(0)
  const [useInterestCalculation, setUseInterestCalculation] = useState(false)
  const [globalInterestRate, setGlobalInterestRate] = useState(0.001)

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = salePrice - totalPaid
  const principalPaid = payments.reduce((sum, p) => sum + Number(p.principal_amount || p.amount), 0)
  const interestPaid = payments.reduce((sum, p) => sum + Number(p.interest_amount || 0), 0)
  const remainingBalance = salePrice - principalPaid

  useEffect(() => {
    if (open) {
      setIsInitialLoading(true)
      // Fetch all data in parallel and wait for all to complete
      Promise.all([
        fetchPayments(),
        fetchSubdivisionData(),
        fetchGlobalInterestRate(),
      ]).finally(() => {
        setIsInitialLoading(false)
      })
      
      if (buyer?.email) {
        setNewPaymentEmail(buyer.email)
      }
    } else {
      // Reset loading state when dialog closes
      setIsInitialLoading(true)
    }
  }, [open, propertyId, subdivisionId, buyer])

  const fetchSubdivisionData = async () => {
    if (!subdivisionId) return

    const supabase = createClient()
    const { data } = await supabase
      .from("subdivisions")
      .select("daily_interest_rate, interest_grace_period_days, last_payment_date, payment_plan_type")
      .eq("id", subdivisionId)
      .single()

    if (data) {
      setSubdivisionData(data)
      // Determine if we should use interest calculation
      setUseInterestCalculation(data.payment_plan_type === "mortgage")
    }
  }

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

  const handleInterestCalculation = (interest: number, days: number) => {
    setCalculatedInterest(interest)
    setCalculatedDays(days)
  }

  const fetchPayments = async () => {
    const supabase = createClient()
    let query = supabase.from("payments").select("*, buyer:buyers(*)")

    if (subdivisionId) {
      query = query.eq("subdivision_id", subdivisionId)
    } else if (propertyId) {
      query = query.eq("property_id", propertyId)
    }

    const { data, error } = await query.order("payment_date", { ascending: false })

    if (!error && data) {
      setPayments(data)
    }
  }

  const handleAddPayment = async () => {
    if (!newAmount || Number.parseFloat(newAmount) <= 0) return

    setIsLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    const paymentAmount = Number.parseFloat(newAmount)
    let interestAmount = 0
    let principalAmount = paymentAmount
    let daysSinceLastPayment = null
    let interestRateUsed = null
    let gracePeriodUsed = null

    // Calculate interest if it's a mortgage payment plan
    if (useInterestCalculation && subdivisionData) {
      const dailyRate = subdivisionData.daily_interest_rate ?? globalInterestRate
      const gracePeriod = subdivisionData.interest_grace_period_days ?? 30
      interestRateUsed = dailyRate
      gracePeriodUsed = gracePeriod

      // Calculate days since last payment
      if (subdivisionData.last_payment_date) {
        const lastPayment = new Date(subdivisionData.last_payment_date)
        lastPayment.setHours(0, 0, 0, 0)
        const paymentDate = new Date(newDate)
        paymentDate.setHours(0, 0, 0, 0)
        daysSinceLastPayment = Math.floor((paymentDate.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24))
      } else {
        // If no last payment, calculate from sale date (we'll need to get this)
        daysSinceLastPayment = 0
      }

      // Calculate interest on remaining balance using days directly (no grace period subtraction)
      // Interest is added to the balance, then payment is subtracted
      interestAmount = remainingBalance * dailyRate * daysSinceLastPayment
      interestAmount = Math.round(interestAmount * 100) / 100 // Round to 2 decimals

      // Interest is added to the balance first, then payment reduces the total
      // New balance = (remainingBalance + interest) - paymentAmount
      // The payment reduces the principal balance, but we need to account for interest
      // If payment > interest, then (payment - interest) goes to principal
      // If payment <= interest, all goes to interest, principalAmount = 0
      if (paymentAmount > interestAmount) {
        principalAmount = paymentAmount - interestAmount
      } else {
        // Payment is less than or equal to interest, all goes to interest
        principalAmount = 0
      }
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        property_id: propertyId || null,
        subdivision_id: subdivisionId || null,
        buyer_id: buyerId || null,
        amount: paymentAmount,
        payment_date: newDate,
        notes: newNotes.trim() || null,
        interest_amount: interestAmount > 0 ? interestAmount : null,
        principal_amount: principalAmount > 0 ? principalAmount : null,
        days_since_last_payment: daysSinceLastPayment,
        interest_calculation_date: newDate,
        interest_rate_used: interestRateUsed,
        grace_period_days: gracePeriodUsed,
      })
      .select("*, buyer:buyers(*)")
      .single()

    if (!error && data) {
      // Update subdivision's last_payment_date and total_interest_charged
      if (subdivisionId) {
        const updateData: any = {
          last_payment_date: newDate,
        }

        if (interestAmount > 0) {
          // Get current total interest charged
          const { data: subData } = await supabase
            .from("subdivisions")
            .select("total_interest_charged")
            .eq("id", subdivisionId)
            .single()

          const currentTotalInterest = subData?.total_interest_charged || 0
          updateData.total_interest_charged = currentTotalInterest + interestAmount
        }

        await supabase.from("subdivisions").update(updateData).eq("id", subdivisionId)
      }

      const updatedPayments = [data, ...payments]
      setPayments(updatedPayments)
      const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      onPaymentsChange(newTotalPaid)
      
      // Reset interest calculation
      setCalculatedInterest(0)
      setCalculatedDays(0)

      // If send email is checked, open the receipt dialog
      if (sendEmailNow) {
        // Create receipt and send email
        const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

        const { data: newReceipt } = await supabase
          .from("receipts")
          .insert({
            user_id: user.id,
            payment_id: data.id,
            receipt_number: receiptNumber,
          })
          .select()
          .single()

        if (newReceipt && newPaymentEmail.trim()) {
          await supabase.from("receipt_emails").insert({
            user_id: user.id,
            receipt_id: newReceipt.id,
            email_address: newPaymentEmail.trim(),
          })
        }
      }

      setNewAmount("")
      setNewNotes("")
      setNewDate(new Date().toISOString().split("T")[0])
      setSendEmailNow(false)
      
      // Refresh subdivision data to get updated last_payment_date
      if (subdivisionId) {
        fetchSubdivisionData()
      }
    }

    setIsLoading(false)
  }

  const handleDeletePayment = async (paymentId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("payments").delete().eq("id", paymentId)

    if (!error) {
      const updatedPayments = payments.filter((p) => p.id !== paymentId)
      setPayments(updatedPayments)
      const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      onPaymentsChange(newTotalPaid)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate total paid before a specific payment (for receipt balance calculation)
  const getTotalPaidBefore = (paymentIndex: number) => {
    return payments.slice(paymentIndex + 1).reduce((sum, p) => sum + Number(p.amount), 0)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>Track payments for this sale</DialogDescription>
          </DialogHeader>

          {isInitialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary */}
          <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted p-4 sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Sale Price</p>
              <p className="font-semibold">{formatCurrency(salePrice)}</p>
            </div>
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Paid</p>
              <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
              {useInterestCalculation && interestPaid > 0 && (
                <p className="text-xs text-muted-foreground">
                  Principal: {formatCurrency(principalPaid)} | Interest: {formatCurrency(interestPaid)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Balance</p>
              <p className={`font-semibold ${remainingBalance > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(remainingBalance)}
              </p>
            </div>
          </div>

          {/* Interest Calculator (for mortgage plans) - only show after first payment */}
          {useInterestCalculation && subdivisionData && payments.length > 0 && (
            <InterestCalculator
              remainingBalance={remainingBalance}
              dailyInterestRate={subdivisionData.daily_interest_rate ?? globalInterestRate}
              gracePeriodDays={subdivisionData.interest_grace_period_days ?? 30}
              lastPaymentDate={
                subdivisionData.last_payment_date ? new Date(subdivisionData.last_payment_date) : null
              }
              onCalculate={handleInterestCalculation}
            />
          )}

          {/* Add Payment Form */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Add Payment</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                />
                {useInterestCalculation && calculatedInterest > 0 && newAmount && (
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <p>
                      Interest: {formatCurrency(calculatedInterest)} | Principal:{" "}
                      {formatCurrency(Number.parseFloat(newAmount || "0") - calculatedInterest)}
                    </p>
                    <p className="text-orange-600">
                      Total Due: {formatCurrency(remainingBalance + calculatedInterest)}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Payment Date *</Label>
                <Input id="date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Payment notes..."
                rows={2}
              />
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmailNow}
                  onCheckedChange={(checked) => setSendEmailNow(checked as boolean)}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                  Send receipt notification
                </Label>
              </div>
              {sendEmailNow && (
                <div className="space-y-1">
                  <Label htmlFor="paymentEmail" className="text-xs">
                    Email Address
                  </Label>
                  <Input
                    id="paymentEmail"
                    type="email"
                    value={newPaymentEmail}
                    onChange={(e) => setNewPaymentEmail(e.target.value)}
                    placeholder="buyer@email.com"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleAddPayment}
              disabled={isLoading || !newAmount || Number.parseFloat(newAmount) <= 0}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </div>

          {/* Payment List */}
          <div className="space-y-2">
            <h4 className="font-medium">Payment History</h4>
            {payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment, index) => {
                  // Calculate balance after this payment
                  const totalPaidBeforeThis = payments.slice(index + 1).reduce((sum, p) => sum + Number(p.amount), 0)
                  const balanceAfterThis = salePrice - (totalPaidBeforeThis + Number(payment.amount))
                  
                  return (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Date:</span>
                            <span className="text-sm">{new Date(payment.payment_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Payment:</span>
                            <span className="font-medium text-base">{formatCurrency(Number(payment.amount))}</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Balance:</span>
                            <span className={`text-base font-semibold ${balanceAfterThis > 0 ? "text-orange-600" : "text-green-600"}`}>
                              {formatCurrency(balanceAfterThis)}
                            </span>
                          </div>
                          {/* {payment.interest_amount && payment.interest_amount > 0 && (
                            <>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Principal:</span>
                                <span className="text-sm">{formatCurrency(Number(payment.principal_amount || 0))}</span>
                              </div>
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Interest:</span>
                                <span className="text-sm">{formatCurrency(Number(payment.interest_amount))}</span>
                              </div>
                              {payment.days_since_last_payment !== null && payment.days_since_last_payment !== undefined && (
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">Days since last payment:</span>
                                  <span className="text-sm">{payment.days_since_last_payment} days</span>
                                </div>
                              )}
                            </>
                          )} */}
                          
                          {payment.notes && (
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Notes:</span>
                              <span className="text-sm text-right break-words max-w-[60%]">{payment.notes}</span>
                            </div>
                          )}
                        </div>
                        <Separator className="my-3" />
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedPaymentForReceipt({ ...payment, buyer })}
                            title="View Receipt"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                          <DocumentsManager
                            paymentId={payment.id}
                            triggerLabel=""
                            triggerVariant="ghost"
                            triggerSize="icon"
                          />
                          {/* <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {selectedPaymentForReceipt && (
        <ReceiptDialog
          open={!!selectedPaymentForReceipt}
          onOpenChange={(open) => !open && setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          propertyTitle={propertyTitle}
          subdivisionTitle={subdivisionTitle}
          salePrice={salePrice}
          totalPaidBefore={getTotalPaidBefore(payments.findIndex((p) => p.id === selectedPaymentForReceipt.id))}
        />
      )}
    </>
  )
}
