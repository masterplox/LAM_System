"use client"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { useEffect, useState } from "react"

export interface Buyer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface BuyerSelectorProps {
  value?: string
  onValueChange: (buyerId: string) => void
  onAddNew?: () => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BuyerSelector({
  value,
  onValueChange,
  onAddNew,
  label = "Buyer",
  placeholder = "Select a buyer...",
  disabled = false,
  className,
}: BuyerSelectorProps) {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Log when value prop changes
  useEffect(() => {
    console.log("[BuyerSelector] Value prop received/changed:", value)
  }, [value])

  const fetchBuyers = async () => {
    console.log("[BuyerSelector] Fetching buyers...")
    setIsLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from("buyers").select("*").order("name")

    if (!error && data) {
      console.log("[BuyerSelector] Buyers fetched successfully:", {
        count: data.length,
        buyerIds: data.map((b) => b.id),
        buyerNames: data.map((b) => b.name),
      })
      setBuyers(data)
    } else {
      console.error("[BuyerSelector] Error fetching buyers:", error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBuyers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Find the selected buyer - ensure we handle empty strings and null/undefined
  const selectedBuyer = value && value.trim() !== "" ? buyers.find((buyer) => buyer.id === value) : null

  // Log when selectedBuyer changes
  useEffect(() => {
    if (value && value.trim() !== "") {
      if (selectedBuyer) {
        console.log("[BuyerSelector] Selected buyer found:", {
          buyerId: selectedBuyer.id,
          buyerName: selectedBuyer.name,
          value: value,
        })
      } else if (buyers.length > 0) {
        console.warn("[BuyerSelector] Buyer not found in list:", {
          value: value,
          availableBuyerIds: buyers.map((b) => b.id),
          buyersCount: buyers.length,
        })
      }
    }
  }, [selectedBuyer, value, buyers])

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              disabled={disabled || isLoading}
            >
              <span className="flex-1 text-left truncate">
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 inline" />
                    <span className="text-muted-foreground">Loading buyer...</span>
                  </>
                ) : selectedBuyer ? (
                  selectedBuyer.name
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search buyers..." />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? "Loading..." : "No buyers found."}
                </CommandEmpty>
                <CommandGroup>
                  {buyers.map((buyer) => (
                    <CommandItem
                      key={buyer.id}
                      value={buyer.name}
                      onSelect={() => {
                        onValueChange(buyer.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === buyer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{buyer.name}</span>
                        {(buyer.email || buyer.phone) && (
                          <span className="text-xs text-muted-foreground">
                            {[buyer.email, buyer.phone].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddNew}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">New</span>
          </Button>
        )}
      </div>
    </div>
  )
}
