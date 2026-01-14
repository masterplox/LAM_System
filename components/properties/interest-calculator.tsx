"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Calculator, CalendarIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface InterestCalculatorProps {
  remainingBalance: number
  dailyInterestRate: number
  gracePeriodDays: number
  lastPaymentDate: Date | null
  onCalculate: (interest: number, days: number) => void
}

export function InterestCalculator({
  remainingBalance,
  dailyInterestRate,
  gracePeriodDays,
  lastPaymentDate,
  onCalculate,
}: InterestCalculatorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calculatedInterest, setCalculatedInterest] = useState<number>(0)
  const [calculatedDays, setCalculatedDays] = useState<number>(0)

  const calculateInterest = (days: number) => {
    // Use days directly for interest calculation
    const interest = remainingBalance * dailyInterestRate * days
    return Math.round(interest * 100) / 100 // Round to 2 decimal places
  }

  const calculateFromDate = (date: Date) => {
    // Normalize dates to midnight for accurate day calculations
    const normalizeDate = (d: Date) => {
      const normalized = new Date(d)
      normalized.setHours(0, 0, 0, 0)
      return normalized
    }

    const selectedDateNormalized = normalizeDate(date)
    let daysSince = 0

    // Calculate days from last payment date to selected date
    if (lastPaymentDate) {
      const lastPaymentNormalized = normalizeDate(lastPaymentDate)
      daysSince = Math.floor((selectedDateNormalized.getTime() - lastPaymentNormalized.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      // If no last payment date, calculate from today to selected date
      const today = normalizeDate(new Date())
      daysSince = Math.floor((selectedDateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      daysSince = Math.max(0, daysSince)
    }

    const interest = calculateInterest(daysSince)
    setCalculatedInterest(interest)
    setCalculatedDays(daysSince)
    onCalculate(interest, daysSince)
  }

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return
    const newDate = new Date(date) // Create a new date object to ensure it's valid
    setSelectedDate(newDate)
    calculateFromDate(newDate)
  }

  // Auto-calculate on mount
  useEffect(() => {
    calculateFromDate(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Recalculate when lastPaymentDate changes
  useEffect(() => {
    if (selectedDate) {
      calculateFromDate(selectedDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPaymentDate]) // Recalculate when lastPaymentDate changes

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const daysSinceLastPayment = lastPaymentDate
    ? Math.floor((new Date().getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Interest Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Balance:</span>
            <p className="font-medium">{formatCurrency(remainingBalance)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Daily Rate:</span>
            <p className="font-medium">{(dailyInterestRate * 100).toFixed(3)}%</p>
          </div>
        </div>

        {lastPaymentDate && daysSinceLastPayment !== null && (
          <div className="rounded-lg bg-muted p-2 text-xs">
            <p className="text-muted-foreground">
              Last Payment: {lastPaymentDate.toLocaleDateString()} ({daysSinceLastPayment} days ago)
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Calculation Date</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              onClick={() => calculateFromDate(selectedDate)}
              size="sm"
              variant="default"
            >
              Calculate
            </Button>
          </div>
          {lastPaymentDate && (
            <p className="text-xs text-muted-foreground">
              Days from last payment ({lastPaymentDate.toLocaleDateString()}) to selected date
            </p>
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Days:</span>
            <span className="font-medium">{calculatedDays}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interest:</span>
            <span className="font-medium text-orange-600">{formatCurrency(calculatedInterest)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-1 border-t">
            <span>Total Due:</span>
            <span className="text-primary">
              {formatCurrency(remainingBalance + calculatedInterest)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
