"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DocumentsManager } from "./documents-manager"
import { ReceiptDialog } from "./receipt-dialog"
import { createClient } from "@/lib/supabase/client"
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
  const [newAmount, setNewAmount] = useState("")
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0])
  const [newNotes, setNewNotes] = useState("")
  const [sendEmailNow, setSendEmailNow] = useState(false)
  const [newPaymentEmail, setNewPaymentEmail] = useState(buyer?.email || "")
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = salePrice - totalPaid

  useEffect(() => {
    if (open) {
      fetchPayments()
      if (buyer?.email) {
        setNewPaymentEmail(buyer.email)
      }
    }
  }, [open, propertyId, subdivisionId, buyer])

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

    const { data, error } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        property_id: propertyId || null,
        subdivision_id: subdivisionId || null,
        buyer_id: buyerId || null,
        amount: Number.parseFloat(newAmount),
        payment_date: newDate,
        notes: newNotes.trim() || null,
      })
      .select("*, buyer:buyers(*)")
      .single()

    if (!error && data) {
      const updatedPayments = [data, ...payments]
      setPayments(updatedPayments)
      const newTotalPaid = updatedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      onPaymentsChange(newTotalPaid)

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

          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted p-4 sm:grid-cols-3 sm:gap-4">
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Sale Price</p>
              <p className="font-semibold">{formatCurrency(salePrice)}</p>
            </div>
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Paid</p>
              <p className="font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="flex items-center justify-between sm:block sm:text-center">
              <p className="text-sm text-muted-foreground sm:text-xs">Balance</p>
              <p className={`font-semibold ${balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {/* Add Payment Form */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="font-medium">Add Payment</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
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
                {payments.map((payment, index) => (
                  <Card key={payment.id}>
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{formatCurrency(Number(payment.amount))}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleDateString()}
                          {payment.notes && ` • ${payment.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
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
