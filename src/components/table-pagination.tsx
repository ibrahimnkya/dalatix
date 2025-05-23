"use client"

import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"

interface TablePaginationProps {
    currentPage: number
    totalItems: number
    pageSize: number
    onPageChange: (page: number) => void
}

export function TablePagination({ currentPage, totalItems, pageSize, onPageChange }: TablePaginationProps) {
    const totalPages = Math.ceil(totalItems / pageSize)

    // Calculate the range of items being displayed
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems)

    return (
        <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                {totalItems > 0 ? (
                    <>
                        Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span>{" "}
                        of <span className="font-medium">{totalItems}</span> items
                    </>
                ) : (
                    <>No items found</>
                )}
            </div>
            <div className="space-x-2">
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <span className="sr-only">Go to previous page</span>
                    <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    <span className="sr-only">Go to next page</span>
                    <ArrowRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
