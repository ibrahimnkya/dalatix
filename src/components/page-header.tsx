import type React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    heading?: string
    text?: string
    action?: React.ReactNode // For backward compatibility
    actions?: React.ReactNode // New preferred prop name
    className?: string
}

export function PageHeader({ title, description, heading, text, action, actions, className }: PageHeaderProps) {
    // Use actions if provided, otherwise fall back to action
    const actionContent = actions || action

    // Support both naming conventions
    const headerTitle = heading || title
    const headerDescription = text || description

    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4", className)}>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">{headerTitle}</h1>
                {headerDescription && <p className="text-muted-foreground">{headerDescription}</p>}
            </div>
            {actionContent && <div className="flex items-center gap-2 ml-auto">{actionContent}</div>}
        </div>
    )
}
