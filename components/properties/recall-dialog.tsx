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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"
import { useState } from "react"

interface RecallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subdivisionId: string
  subdivisionTitle: string
  holdUntilDate: string | null
  onRecall: (reason: string) => Promise<boolean>
}

export function RecallDialog({
  open,
  onOpenChange,
  subdivisionId,
  subdivisionTitle,
  holdUntilDate,
  onRecall,
}: RecallDialogProps) {
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleRecall = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for the recall")
      return
    }

    setIsLoading(true)
    const success = await onRecall(reason.trim())
    setIsLoading(false)

    if (success) {
      onOpenChange(false)
      setReason("")
    }
  }

  const isExpired = holdUntilDate ? new Date(holdUntilDate) < new Date() : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Recall Lot
          </DialogTitle>
          <DialogDescription>
            Recall this lot and reset it to available status. All payments, documents, and sale information will be cleared, but a history record will be preserved for reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">Lot: {subdivisionTitle}</p>
            {holdUntilDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Hold Until: {new Date(holdUntilDate).toLocaleDateString()}
                {isExpired && <span className="text-red-600 ml-2">(Expired)</span>}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recall-reason">Reason for Recall *</Label>
            <Textarea
              id="recall-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Hold expired, buyer defaulted, buyer requested cancellation..."
              rows={4}
              required
            />
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm text-orange-900">
              <strong>Note:</strong> This action will:
            </p>
            <ul className="text-sm text-orange-800 mt-2 list-disc list-inside space-y-1">
              <li>Reset the lot status to "available"</li>
              <li>Clear all payments and documents</li>
              <li>Remove buyer assignment and sale information</li>
              <li>Save recall history for reporting (buyer, reason, dates, amounts)</li>
              <li>The lot can be sold to another buyer</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRecall}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? "Recalling..." : "Recall Lot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
