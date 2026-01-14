"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Check, Download, FileText, History, Loader2, Mail, Send } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { Payment } from "./payments-dialog"
import type { Buyer } from "./sale-dialog"

interface Receipt {
  id: string
  user_id: string
  payment_id: string
  receipt_number: string
  generated_at: string
  created_at: string
}

interface ReceiptEmail {
  id: string
  user_id: string
  receipt_id: string
  email_address: string
  sent_at: string
}

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment & { buyer?: Buyer | null }
  propertyTitle: string
  subdivisionTitle?: string
  salePrice: number
  totalPaidBefore: number // Total paid before this payment
}

export function ReceiptDialog({
  open,
  onOpenChange,
  payment,
  propertyTitle,
  subdivisionTitle,
  salePrice,
  totalPaidBefore,
}: ReceiptDialogProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [emailHistory, setEmailHistory] = useState<ReceiptEmail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emailAddress, setEmailAddress] = useState("")
  const [sendSuccess, setSendSuccess] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  const balanceAfter = salePrice - (totalPaidBefore + Number(payment.amount))

  useEffect(() => {
    if (open) {
      fetchOrCreateReceipt()
      // Pre-fill email with buyer's email if available
      if (payment.buyer?.email) {
        setEmailAddress(payment.buyer.email)
      }
    }
  }, [open, payment.id])

  const fetchOrCreateReceipt = async () => {
    setIsLoading(true)
    const supabase = createClient()

    // Try to fetch existing receipt
    const { data: existingReceipt } = await supabase.from("receipts").select("*").eq("payment_id", payment.id).single()

    if (existingReceipt) {
      setReceipt(existingReceipt)
      fetchEmailHistory(existingReceipt.id)
    } else {
      // Create new receipt
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const { data: newReceipt, error } = await supabase
        .from("receipts")
        .insert({
          user_id: user.id,
          payment_id: payment.id,
          receipt_number: receiptNumber,
        })
        .select()
        .single()

      if (!error && newReceipt) {
        setReceipt(newReceipt)
      }
    }

    setIsLoading(false)
  }

  const fetchEmailHistory = async (receiptId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("receipt_emails")
      .select("*")
      .eq("receipt_id", receiptId)
      .order("sent_at", { ascending: false })

    if (data) {
      setEmailHistory(data)
    }
  }

  const handleSendEmail = async () => {
    if (!receipt || !emailAddress.trim()) return

    setIsSending(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setIsSending(false)
      return
    }

    // Record the email send (in a real app, you'd integrate with an email service here)
    const { data, error } = await supabase
      .from("receipt_emails")
      .insert({
        user_id: user.id,
        receipt_id: receipt.id,
        email_address: emailAddress.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setEmailHistory([data, ...emailHistory])
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    }

    setIsSending(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt ${receipt?.receipt_number}</title>
              <style>
                body { font-family: system-ui, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { font-size: 24px; margin: 0; }
                .header p { color: #666; margin: 5px 0; }
                .details { margin: 20px 0; }
                .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .row:last-child { border-bottom: none; }
                .label { color: #666; }
                .value { font-weight: 500; }
                .amount { font-size: 20px; font-weight: bold; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>PAYMENT RECEIPT</h1>
                <p>${receipt?.receipt_number}</p>
              </div>
              <div class="details">
                <div class="row"><span class="label">Date</span><span class="value">${new Date(payment.payment_date).toLocaleDateString()}</span></div>
                <div class="row"><span class="label">Property</span><span class="value">${propertyTitle}</span></div>
                ${subdivisionTitle ? `<div class="row"><span class="label">Subdivision</span><span class="value">${subdivisionTitle}</span></div>` : ""}
                ${payment.buyer ? `<div class="row"><span class="label">Buyer</span><span class="value">${payment.buyer.name}</span></div>` : ""}
              </div>
              <div class="amount">
                Payment Amount: ${formatCurrency(Number(payment.amount))}
              </div>
              ${payment.interest_amount && payment.interest_amount > 0 ? `
              <div class="interest-breakdown" style="margin: 15px 0; padding: 10px; background: #fef3c7; border-radius: 5px; font-size: 12px;">
                <div style="margin-bottom: 5px;"><strong>Payment Breakdown:</strong></div>
                <div>Principal: ${formatCurrency(Number(payment.principal_amount || 0))}</div>
                <div style="color: #ea580c;">Interest (${payment.days_since_last_payment || 0} days): ${formatCurrency(Number(payment.interest_amount))}</div>
                ${payment.interest_rate_used ? `<div style="color: #666; margin-top: 5px;">Rate: ${(Number(payment.interest_rate_used) * 100).toFixed(3)}% per day</div>` : ""}
              </div>
              ` : ""}
              <div class="details">
                <div class="row"><span class="label">Sale Price</span><span class="value">${formatCurrency(salePrice)}</span></div>
                <div class="row"><span class="label">Previously Paid</span><span class="value">${formatCurrency(totalPaidBefore)}</span></div>
                <div class="row"><span class="label">This Payment</span><span class="value">${formatCurrency(Number(payment.amount))}</span></div>
                <div class="row"><span class="label">Balance Remaining</span><span class="value">${formatCurrency(balanceAfter)}</span></div>
              </div>
              ${payment.notes ? `<p style="margin-top: 20px; color: #666;"><strong>Notes:</strong> ${payment.notes}</p>` : ""}
              <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Thank you for your payment!</p>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment Receipt
          </DialogTitle>
          <DialogDescription>{receipt?.receipt_number || "Generating receipt..."}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="receipt" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <History className="h-3 w-3" />
                Email History
                {emailHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {emailHistory.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="receipt" className="space-y-4">
              {/* Receipt Preview */}
              <Card ref={receiptRef}>
                <CardContent className="p-4 space-y-4">
                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold">PAYMENT RECEIPT</h3>
                    <p className="text-sm text-muted-foreground">{receipt?.receipt_number}</p>
                  </div>

                  <Separator />

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property</span>
                      <span className="font-medium">{propertyTitle}</span>
                    </div>
                    {subdivisionTitle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subdivision</span>
                        <span className="font-medium">{subdivisionTitle}</span>
                      </div>
                    )}
                    {payment.buyer && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Buyer</span>
                        <span className="font-medium">{payment.buyer.name}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Amount */}
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Payment Amount</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(Number(payment.amount))}</p>
                    {payment.interest_amount && payment.interest_amount > 0 && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>
                          Principal: {formatCurrency(Number(payment.principal_amount || 0))} | Interest:{" "}
                          <span className="text-orange-600">{formatCurrency(Number(payment.interest_amount))}</span>
                        </p>
                        {payment.days_since_last_payment !== null && payment.days_since_last_payment !== undefined && (
                          <p className="text-muted-foreground">
                            Interest for {payment.days_since_last_payment} days
                            {payment.interest_rate_used && (
                              <span> ({(Number(payment.interest_rate_used) * 100).toFixed(3)}% per day)</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Balance Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sale Price</span>
                      <span>{formatCurrency(salePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previously Paid</span>
                      <span>{formatCurrency(totalPaidBefore)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">This Payment</span>
                      <span className="text-green-600">+{formatCurrency(Number(payment.amount))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Balance Remaining</span>
                      <span className={balanceAfter > 0 ? "text-orange-600" : "text-green-600"}>
                        {formatCurrency(balanceAfter)}
                      </span>
                    </div>
                  </div>

                  {payment.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{payment.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={handlePrint}>
                  <Download className="mr-2 h-4 w-4" />
                  Print / Download
                </Button>
              </div>

              {/* Send Email Section */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send Receipt via Email
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1"
                      />
                      <Button onClick={handleSendEmail} disabled={isSending || !emailAddress.trim() || sendSuccess}>
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : sendSuccess ? (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            Sent
                          </>
                        ) : (
                          <>
                            <Send className="mr-1 h-4 w-4" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {emailHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No emails sent yet</p>
                  <p className="text-xs text-muted-foreground">Send this receipt to record email history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailHistory.map((email) => (
                    <Card key={email.id}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                            <Check className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{email.email_address}</p>
                            <p className="text-xs text-muted-foreground">
                              Sent on {new Date(email.sent_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setEmailAddress(email.email_address)}>
                          Resend
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
