"use client"

import { Button } from "@/components/ui/button"
import type { TimeFrame } from "@/types/dashboard"

interface TimeFrameSelectorProps {
    value: TimeFrame
    onChange: (value: TimeFrame) => void
}

export function TimeFrameSelector({ value, onChange }: TimeFrameSelectorProps) {
    const timeFrames: { value: TimeFrame; label: string }[] = [
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
    ]

    return (
        <div className="flex space-x-1">
            {timeFrames.map((timeFrame) => (
                <Button
                    key={timeFrame.value}
                    variant={value === timeFrame.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange(timeFrame.value)}
                    className="px-3"
                >
                    {timeFrame.label}
                </Button>
            ))}
        </div>
    )
}
