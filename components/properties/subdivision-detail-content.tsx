"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Grid3X3,
  MapPin,
  Ruler,
  User,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AllDocumentsView } from "./all-documents-view"
import { DocumentsManager } from "./documents-manager"
import { PaymentsDialog, type Payment } from "./payments-dialog"
import type { Subdivision } from "./property-detail-content"
import { ReceiptDialog } from "./receipt-dialog"
import type { Buyer } from "./sale-dialog"

interface SubdivisionDetailContentProps {
  subdivision: Subdivision
  propertyTitle: string
}

export function SubdivisionDetailContent({ subdivision: initialSubdivision, propertyTitle }: SubdivisionDetailContentProps) {
  const router = useRouter()
  const [subdivision, setSubdivision] = useState<Subdivision>(initialSubdivision)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(true)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false)
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null)
  const [totalPaid, setTotalPaid] = useState(0)
  const [principalPaid, setPrincipalPaid] = useState(0)
  const [interestPaid, setInterestPaid] = useState(0)

  useEffect(() => {
    fetchSubdivision()
    fetchPayments()
  }, [initialSubdivision.id])

  const fetchSubdivision = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("subdivisions")
      .select(`*, buyer:buyers(*)`)
      .eq("id", initialSubdivision.id)
      .single()

    if (!error && data) {
      setSubdivision(data as Subdivision)
    }
  }

  const fetchPayments = async () => {
    setIsLoadingPayments(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("payments")
      .select("*, buyer:buyers(*)")
      .eq("subdivision_id", initialSubdivision.id)
      .order("payment_date", { ascending: false })

    if (!error && data) {
      setPayments(data)
      const total = data.reduce((sum, p) => sum + Number(p.amount), 0)
      const principal = data.reduce((sum, p) => sum + Number(p.principal_amount || p.amount), 0)
      const interest = data.reduce((sum, p) => sum + Number(p.interest_amount || 0), 0)
      setTotalPaid(total)
      setPrincipalPaid(principal)
      setInterestPaid(interest)
    }
    setIsLoadingPayments(false)
  }

  const handlePaymentsChange = (newTotalPaid: number) => {
    setTotalPaid(newTotalPaid)
    fetchPayments()
    fetchSubdivision()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "sold":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "mortgage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "paid_in_full":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      case "recalled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const salePrice = subdivision.sale_price || 0
  const remainingBalance = salePrice - principalPaid
  const hasPayments = payments.length > 0

  // Calculate total paid before a specific payment (for receipt balance calculation)
  const getTotalPaidBefore = (paymentIndex: number) => {
    return payments.slice(paymentIndex + 1).reduce((sum, p) => sum + Number(p.amount), 0)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{subdivision.title}</h1>
            <p className="text-muted-foreground mt-1">Property: {propertyTitle}</p>
          </div>
        </div>
        <Badge className={getStatusBadgeColor(subdivision.status)}>
          {subdivision.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sale Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salePrice)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            {subdivision.payment_plan_type === "mortgage" && interestPaid > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Principal: {formatCurrency(principalPaid)} | Interest: {formatCurrency(interestPaid)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingBalance > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(remainingBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subdivision.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{subdivision.description}</p>
                  </div>
                )}
                {subdivision.lot_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lot Number</p>
                    <p className="font-medium">{subdivision.lot_number}</p>
                  </div>
                )}
                {subdivision.surveyor_plan_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Surveyor Plan Number</p>
                    <p className="font-medium">{subdivision.surveyor_plan_number}</p>
                  </div>
                )}
                {subdivision.registration_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{subdivision.registration_number}</p>
                  </div>
                )}
                {subdivision.mutation_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Mutation Number</p>
                    <p className="font-medium">{subdivision.mutation_number}</p>
                  </div>
                )}
                {subdivision.title_nes_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Title NES Number</p>
                    <p className="font-medium">{subdivision.title_nes_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Physical Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Physical Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subdivision.acres && (
                  <div>
                    <p className="text-sm text-muted-foreground">Acres</p>
                    <p className="font-medium">{subdivision.acres}</p>
                  </div>
                )}
                {subdivision.length && (
                  <div>
                    <p className="text-sm text-muted-foreground">Length</p>
                    <p className="font-medium">{subdivision.length}</p>
                  </div>
                )}
                {subdivision.width && (
                  <div>
                    <p className="text-sm text-muted-foreground">Width</p>
                    <p className="font-medium">{subdivision.width}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner Information */}
            {(subdivision.owner_first_name || subdivision.owner_middle_name || subdivision.owner_last_name) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subdivision.owner_first_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">First Name</p>
                      <p className="font-medium">{subdivision.owner_first_name}</p>
                    </div>
                  )}
                  {subdivision.owner_middle_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Middle Name</p>
                      <p className="font-medium">{subdivision.owner_middle_name}</p>
                    </div>
                  )}
                  {subdivision.owner_last_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Last Name</p>
                      <p className="font-medium">{subdivision.owner_last_name}</p>
                    </div>
                  )}
                  {subdivision.submission_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Submission Date</p>
                      <p className="font-medium">{formatDate(subdivision.submission_date)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sale Information */}
            {subdivision.buyer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Sale Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Buyer</p>
                    <p className="font-medium">{subdivision.buyer.name}</p>
                    {subdivision.buyer.email && (
                      <p className="text-sm text-muted-foreground">{subdivision.buyer.email}</p>
                    )}
                    {subdivision.buyer.phone && (
                      <p className="text-sm text-muted-foreground">{subdivision.buyer.phone}</p>
                    )}
                  </div>
                  {subdivision.payment_plan_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Plan</p>
                      <p className="font-medium capitalize">{subdivision.payment_plan_type}</p>
                    </div>
                  )}
                  {subdivision.daily_interest_rate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Interest Rate</p>
                      <p className="font-medium">{(subdivision.daily_interest_rate * 100).toFixed(4)}%</p>
                    </div>
                  )}
                  {subdivision.interest_grace_period_days && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grace Period</p>
                      <p className="font-medium">{subdivision.interest_grace_period_days} days</p>
                    </div>
                  )}
                  {subdivision.hold_until_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Hold Until</p>
                      <p className="font-medium">{formatDate(subdivision.hold_until_date)}</p>
                    </div>
                  )}
                  {subdivision.hold_amount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Hold Amount</p>
                      <p className="font-medium">{formatCurrency(subdivision.hold_amount)}</p>
                    </div>
                  )}
                  {subdivision.recall_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Recall Date</p>
                      <p className="font-medium">{formatDate(subdivision.recall_date)}</p>
                    </div>
                  )}
                  {subdivision.recall_reason && (
                    <div>
                      <p className="text-sm text-muted-foreground">Recall Reason</p>
                      <p className="font-medium">{subdivision.recall_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(subdivision.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(subdivision.updated_at)}</p>
                </div>
                {subdivision.last_payment_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Payment Date</p>
                    <p className="font-medium">{formatDate(subdivision.last_payment_date)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>View and manage all payments for this subdivision</CardDescription>
                </div>
                <Button onClick={() => setIsPaymentsDialogOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPayments ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading payments...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>No payments recorded yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsPaymentsDialogOpen(true)}>
                    Add First Payment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <Card key={payment.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-semibold">{formatCurrency(Number(payment.amount))}</p>
                            {payment.interest_amount && payment.interest_amount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Principal: {formatCurrency(Number(payment.principal_amount || 0))} | Interest:{" "}
                                {formatCurrency(Number(payment.interest_amount))}
                                {payment.days_since_last_payment !== null &&
                                  payment.days_since_last_payment !== undefined && (
                                    <span> ({payment.days_since_last_payment} days)</span>
                                  )}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(payment.payment_date)}
                            {payment.notes && ` • ${payment.notes}`}
                          </p>
                          {payment.buyer && (
                            <p className="text-xs text-muted-foreground mt-1">Buyer: {payment.buyer.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPaymentForReceipt({ ...payment, buyer: subdivision.buyer || undefined })}
                            title="View Receipt"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <DocumentsManager
                            paymentId={payment.id}
                            triggerLabel=""
                            triggerVariant="ghost"
                            triggerSize="icon"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>All documents related to this subdivision</CardDescription>
            </CardHeader>
            <CardContent>
              <AllDocumentsView propertyId={subdivision.property_id} subdivisions={[subdivision]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payments Dialog */}
      <PaymentsDialog
        open={isPaymentsDialogOpen}
        onOpenChange={setIsPaymentsDialogOpen}
        subdivisionId={subdivision.id}
        subdivisionTitle={subdivision.title}
        buyerId={subdivision.buyer_id || undefined}
        buyer={subdivision.buyer || undefined}
        salePrice={salePrice}
        onPaymentsChange={handlePaymentsChange}
      />

      {/* Receipt Dialog */}
      {selectedPaymentForReceipt && (
        <ReceiptDialog
          open={!!selectedPaymentForReceipt}
          onOpenChange={(open) => !open && setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          propertyTitle={propertyTitle}
          subdivisionTitle={subdivision.title}
          salePrice={salePrice}
          totalPaidBefore={getTotalPaidBefore(
            payments.findIndex((p) => p.id === selectedPaymentForReceipt.id)
          )}
        />
      )}
    </div>
  )
}
