"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Search, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type FilterOption = {
    id: string
    label: string
    type: "text" | "select" | "date" | "number"
    options?: { value: string | null; label: string }[]
}

interface TableFiltersProps {
    onSearchChange: (term: string) => void
    filterOptions?: { label: string; value: string | null }[]
    filterValue?: string | null
    onFilterChange?: (value: string | null) => void
    filterLabel?: string
    searchPlaceholder?: string
}

export function TableFilters({
                                 onSearchChange,
                                 filterOptions = [],
                                 filterValue = null,
                                 onFilterChange,
                                 filterLabel = "Status",
                                 searchPlaceholder = "Search...",
                             }: TableFiltersProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [tempFilterValue, setTempFilterValue] = useState<string | null>(filterValue)

    const handleSearch = () => {
        onSearchChange(searchTerm)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch()
        }
    }

    const applyFilters = () => {
        if (onFilterChange) {
            onFilterChange(tempFilterValue)
        }
        setIsFilterOpen(false)
    }

    const resetFilters = () => {
        setTempFilterValue(null)
        if (onFilterChange) {
            onFilterChange(null)
        }
        setIsFilterOpen(false)
    }

    // Get the current filter label for display
    const getCurrentFilterLabel = () => {
        if (!filterValue) return "All"
        const option = filterOptions.find((opt) => opt.value === filterValue)
        return option ? option.label : "All"
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="relative w-full sm:w-auto flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSearch}>
                    Search
                </Button>

                {filterOptions.length > 0 && (
                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <span className="hidden sm:inline">Filter</span>
                                {filterValue && (
                                    <Badge variant="secondary" className="ml-1">
                                        {getCurrentFilterLabel()}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>Filter Options</SheetTitle>
                                <SheetDescription>Apply filters to narrow down your search results.</SheetDescription>
                            </SheetHeader>

                            <div className="py-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="filter-status">{filterLabel}</Label>
                                        <Select
                                            value={tempFilterValue || ""}
                                            onValueChange={(value) => setTempFilterValue(value === "" ? null : value)}
                                        >
                                            <SelectTrigger id="filter-status">
                                                <SelectValue placeholder={`Select ${filterLabel}`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {filterOptions.map((option) => (
                                                    <SelectItem key={option.value || "null"} value={option.value || "null"}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <SheetFooter>
                                <Button variant="outline" onClick={resetFilters}>
                                    Reset
                                </Button>
                                <Button onClick={applyFilters}>Apply Filters</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                )}
            </div>
        </div>
    )
}
