import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg"
    className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
    }

    return <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
}

export function PageLoader() {
    return (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        </div>
    )
}

export function TableLoader() {
    return (
        <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
        </div>
    )
}
