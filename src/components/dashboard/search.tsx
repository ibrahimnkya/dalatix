"use client"

import { Input } from "@/components/ui/input"
import { SearchIcon } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function Search() {
    const isMobile = useIsMobile()

    return (
        <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder={isMobile ? "Search" : "Search..."}
                className="pl-9 h-9 md:w-[200px] lg:w-[300px] w-full max-w-[160px] sm:max-w-none"
            />
        </div>
    )
}
