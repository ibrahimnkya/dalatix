"use client"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMobile } from "@/hooks/use-mobile"

interface CalendarDateRangePickerProps {
    value: DateRange | undefined
    onChange: (date: DateRange) => void
    className?: string
}

export function CalendarDateRangePicker({ value, onChange, className }: CalendarDateRangePickerProps) {
    const isMobile = useMobile()

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        size={isMobile ? "sm" : "default"}
                        className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value?.from ? (
                            value.to ? (
                                <>
                                    {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(value.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={value?.from}
                        selected={value}
                        onSelect={onChange}
                        numberOfMonths={isMobile ? 1 : 2}
                        className={isMobile ? "w-[300px]" : ""}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
