"use client"

import { useState, useEffect } from "react"
import {
    Calendar,
    Search,
    Ticket,
    Eye,
    RefreshCcw,
    MapPin,
    Clock,
    User,
    Bus,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { format, subDays } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { usePermissions } from "@/hooks/use-permissions"
import { useTitle } from "@/context/TitleContext"

interface Booking {
    id: number
    booking_number: string
    fare: string
    percel_fare: string
    type: string
    has_percel: boolean
    user_id: number
    vehicle_id: number | null
    used: boolean
    scanned_in_at: string | null
    scanned_out_at: string | null
    created_at: string
    updated_at: string
    status: string
    expired_at: string | null
    cancelled_at: string | null
    deactivated_at: string | null
    vehicle: {
        id: number
        name: string
        registration_number: string
        company_id?: number
    } | null
    user: {
        id: number
        first_name: string
        last_name: string
    }
    start_point: {
        id: number
        name: string
        code: string
    }
    end_point: {
        id: number
        name: string
        code: string
    }
}

const ITEMS_PER_PAGE = 10

async function getBookings(filters: any = {}) {
    try {
        // Build query parameters
        const params = new URLSearchParams()

        // Date range parameters (required by the API)
        params.set("start_date", filters.start_date || format(subDays(new Date(), 30), "yyyy-MM-dd"))
        params.set("end_date", filters.end_date || format(new Date(), "yyyy-MM-dd"))

        // Don't use pagination in API call - we'll handle it client-side for better filtering
        params.set("paginate", "false")

        // Optional filters
        if (filters.vehicle_id) params.set("vehicle_id", String(filters.vehicle_id))
        if (filters.status) params.set("status", filters.status)
        if (filters.company_id) params.set("company_id", String(filters.company_id))

        console.log("Fetching bookings with params:", params.toString())

        // Use the exact API endpoint provided
        const response = await fetch(`/api/proxy/bookings/by_date_range?${params}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Bookings API error:", response.status, errorText)
            throw new Error(`API Error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log("Raw API response:", data)

        // Handle the actual API response structure
        if (data.success) {
            // If paginated response
            if (data.data && data.data.data && Array.isArray(data.data.data)) {
                console.log("Using paginated response format, found", data.data.data.length, "bookings")
                return data.data.data
            }
            // If direct array response
            if (Array.isArray(data.data)) {
                console.log("Using direct array response format, found", data.data.length, "bookings")
                return data.data
            }
        }

        // If data is directly an array
        if (Array.isArray(data)) {
            console.log("Using direct response format, found", data.length, "bookings")
            return data
        }

        console.warn("Unexpected API response format:", data)
        return []
    } catch (error) {
        console.error("Error fetching bookings:", error)
        throw error
    }
}

// Function to get company vehicles
async function getCompanyVehicles(companyId: number) {
    try {
        const response = await fetch(`/api/proxy/vehicles?company_id=${companyId}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            console.warn("Could not fetch company vehicles")
            return []
        }

        const data = await response.json()
        console.log("Company vehicles response:", data)

        if (data.success && Array.isArray(data.data)) {
            return data.data.map((vehicle: any) => vehicle.id)
        }

        return []
    } catch (error) {
        console.warn("Error fetching company vehicles:", error)
        return []
    }
}

export default function BookingsPage() {
    const { setTitle } = useTitle()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 30), // Default to last 30 days
        to: new Date(),
    })
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [companyVehicleIds, setCompanyVehicleIds] = useState<number[]>([])
    const { toast } = useToast()
    const { companyId } = usePermissions()

    useEffect(() => {
        setTitle("Completed Trips")
    }, [setTitle])

    // Fetch company vehicles when component mounts
    useEffect(() => {
        const fetchCompanyVehicles = async () => {
            if (companyId) {
                try {
                    const vehicleIds = await getCompanyVehicles(companyId)
                    console.log("Company vehicle IDs:", vehicleIds)
                    setCompanyVehicleIds(vehicleIds)
                } catch (error) {
                    console.warn("Could not fetch company vehicles:", error)
                }
            }
        }

        fetchCompanyVehicles()
    }, [companyId])

    // Fetch bookings on initial load and when date range changes
    useEffect(() => {
        fetchBookings()
    }, [dateRange, companyId, companyVehicleIds])

    // Reset to first page when search query changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const fetchBookings = async () => {
        setLoading(true)
        setError(null)

        try {
            if (!companyId) {
                throw new Error("Company ID not available. Please ensure you are logged in as a bus owner.")
            }

            const startDate = format(dateRange.from, "yyyy-MM-dd")
            const endDate = format(dateRange.to, "yyyy-MM-dd")

            console.log("Fetching bookings for company:", companyId, "Date range:", startDate, "to", endDate)

            const response = await getBookings({
                start_date: startDate,
                end_date: endDate,
            })

            console.log("Raw bookings response:", response)
            console.log("Total bookings from API:", response.length)

            // Always ensure bookings is an array
            let bookingsData = Array.isArray(response) ? response : []

            // Filter for bus owners: only show bookings scanned in by company vehicles
            if (companyId && companyVehicleIds.length > 0) {
                const originalCount = bookingsData.length

                bookingsData = bookingsData.filter((booking) => {
                    // Validate booking object
                    if (!booking || typeof booking !== "object") {
                        console.warn("Invalid booking object:", booking)
                        return false
                    }

                    // Must be scanned in (scanned_in_at exists)
                    if (!booking.scanned_in_at) {
                        return false
                    }

                    // Must have a vehicle that scanned it in
                    if (!booking.vehicle_id) {
                        return false
                    }

                    // The vehicle that scanned it must belong to the company
                    const belongsToCompany = companyVehicleIds.includes(booking.vehicle_id)

                    if (!belongsToCompany) {
                        return false
                    }

                    console.log("Booking passed filter:", {
                        id: booking.id,
                        booking_number: booking.booking_number,
                        vehicle_id: booking.vehicle_id,
                        scanned_in_at: booking.scanned_in_at,
                        used: booking.used,
                    })

                    return true
                })

                console.log(`Filtered bookings: ${originalCount} -> ${bookingsData.length} (company: ${companyId})`)
                console.log("Company vehicle IDs:", companyVehicleIds)
                console.log("Filtered bookings:", bookingsData)
            }

            // Validate and clean the booking data
            bookingsData = bookingsData.map((booking) => ({
                ...booking,
                // Ensure required fields have fallback values
                booking_number: booking.booking_number || `BK-${booking.id}`,
                fare: booking.fare || "0",
                percel_fare: booking.percel_fare || "0",
                type: booking.type || "Adult",
                has_percel: Boolean(booking.has_percel),
                used: Boolean(booking.used),
                status: booking.status || "active",
                user: booking.user || { id: 0, first_name: "Unknown", last_name: "User" },
                vehicle: booking.vehicle || null,
                start_point: booking.start_point || { id: 0, name: "Unknown", code: "UNK" },
                end_point: booking.end_point || { id: 0, name: "Unknown", code: "UNK" },
            }))

            console.log("Final processed bookings:", bookingsData)
            setBookings(bookingsData)
        } catch (error) {
            console.error("Error fetching bookings:", error)
            const errorMessage = error instanceof Error ? error.message : "Failed to load bookings. Please try again."
            setError(errorMessage)
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            })
            setBookings([])
        } finally {
            setLoading(false)
        }
    }

    const handleViewBooking = async (booking: Booking) => {
        try {
            // Additional security check for Bus Owners
            if (companyId && companyVehicleIds.length > 0) {
                // Verify this booking was scanned by a company vehicle
                if (!booking.scanned_in_at) {
                    toast({
                        title: "Access Denied",
                        description: "You can only view scanned trips",
                        variant: "destructive",
                    })
                    return
                }

                // Verify the vehicle belongs to the company
                if (booking.vehicle_id && !companyVehicleIds.includes(booking.vehicle_id)) {
                    toast({
                        title: "Access Denied",
                        description: "You can only view trips for your company's vehicles",
                        variant: "destructive",
                    })
                    return
                }
            }

            console.log("Viewing booking details:", booking)
            setSelectedBooking(booking)
            setViewDialogOpen(true)
        } catch (error) {
            console.error("Error viewing booking details:", error)
            toast({
                title: "Error",
                description: "Failed to load booking details",
                variant: "destructive",
            })
        }
    }

    // Calculate actual booking statistics
    const getBookingStats = () => {
        if (!Array.isArray(bookings) || bookings.length === 0) {
            return { total: 0, revenue: 0, avgFare: 0, vehicles: 0 }
        }

        try {
            // Calculate total revenue
            const totalRevenue = bookings.reduce((sum, booking) => {
                const fare = Number.parseFloat(booking.fare) || 0
                const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare) || 0 : 0
                return sum + fare + parcelFare
            }, 0)

            // Count unique vehicles
            const uniqueVehicles = new Set(
                bookings.map((booking) => booking.vehicle_id).filter((id) => id !== null && id !== undefined),
            ).size

            const stats = {
                total: bookings.length,
                revenue: totalRevenue,
                avgFare: bookings.length > 0 ? totalRevenue / bookings.length : 0,
                vehicles: uniqueVehicles,
            }

            console.log("Calculated stats:", stats)
            return stats
        } catch (error) {
            console.error("Error calculating stats:", error)
            return { total: 0, revenue: 0, avgFare: 0, vehicles: 0 }
        }
    }

    const stats = getBookingStats()

    // Add defensive checks before accessing properties
    const filteredBookings = Array.isArray(bookings)
        ? bookings.filter((booking) => {
            if (!booking) return false

            try {
                // Make sure booking and its nested properties exist before accessing
                const bookingNumber = String(booking.booking_number || "")
                const userName = booking.user
                    ? `${String(booking.user.first_name || "")} ${String(booking.user.last_name || "")}`.trim()
                    : ""
                const vehicleName = String(booking.vehicle?.name || "")
                const startPoint = String(booking.start_point?.name || "")
                const endPoint = String(booking.end_point?.name || "")

                const searchLower = searchQuery.toLowerCase()
                return (
                    bookingNumber.toLowerCase().includes(searchLower) ||
                    userName.toLowerCase().includes(searchLower) ||
                    vehicleName.toLowerCase().includes(searchLower) ||
                    startPoint.toLowerCase().includes(searchLower) ||
                    endPoint.toLowerCase().includes(searchLower)
                )
            } catch (error) {
                console.warn("Error filtering booking:", booking, error)
                return false
            }
        })
        : []

    // Pagination logic
    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex)

    const getStatusColor = (status: string, used = false) => {
        if (used) {
            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
        }

        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            case "cancelled":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            case "deactivated":
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
        }
    }

    const getStatusText = (booking: Booking) => {
        if (booking.used) return "Completed"
        const status = booking.status || "unknown"
        return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const getScanningStatus = (booking: Booking) => {
        if (!booking.scanned_in_at) return "Not Scanned In"
        if (!booking.scanned_out_at) return "In Transit"
        return "Completed Journey"
    }

    const getScanningStatusColor = (booking: Booking) => {
        if (!booking.scanned_in_at) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
        if (!booking.scanned_out_at) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    }

    const getTotalFare = (booking: Booking) => {
        const fare = Number.parseFloat(booking.fare) || 0
        const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare) || 0 : 0
        return fare + parcelFare
    }

    // Helper function to safely access booking properties
    const safeStr = (value: any): string => {
        if (value === null || value === undefined) return ""
        return String(value)
    }

    // Helper function to safely format dates
    const safeDate = (dateStr: string | null) => {
        if (!dateStr) return "Not set"
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return "Invalid date"
            return date.toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
            })
        } catch (e) {
            return "Invalid date"
        }
    }

    // Helper function to safely format currency
    const safeAmount = (amount: any) => {
        if (amount === null || amount === undefined) return "TZS 0"
        const num = Number.parseFloat(String(amount))
        return isNaN(num) ? "TZS 0" : `TZS ${num.toLocaleString()}`
    }

    // Helper function to get full name
    const getFullName = (user: any) => {
        if (!user) return "Unknown User"
        const firstName = String(user.first_name || "")
        const lastName = String(user.last_name || "")
        const fullName = `${firstName} ${lastName}`.trim()
        return fullName || "Unknown User"
    }

    // Show error state
    if (error && !loading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Completed Trips - Your Company</h2>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <Button onClick={fetchBookings}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Scanned Trips - Your Company</h2>
                <div className="flex items-center space-x-2">
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <Calendar className="mr-2 h-4 w-4" />
                                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from}
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => {
                                    if (range?.from && range?.to) {
                                        setDateRange({ from: range.from, to: range.to })
                                        setCalendarOpen(false)
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={fetchBookings} disabled={loading}>
                        <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Debug Information */}
            {process.env.NODE_ENV === "development" && (
                <Card className="bg-gray-50">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-600">
                            Debug: Company ID: {companyId}, Vehicle IDs: [{companyVehicleIds.join(", ")}], Total Bookings:{" "}
                            {bookings.length}, Filtered: {filteredBookings.length}
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Scanned Trips</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.total}</div>}
                        <p className="text-xs text-muted-foreground">Trips scanned by your vehicles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <Ticket className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{safeAmount(stats.revenue)}</div>
                        )}
                        <p className="text-xs text-muted-foreground">From scanned trips</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Fare</CardTitle>
                        <Ticket className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{safeAmount(Math.round(stats.avgFare))}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Per scanned trip</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                        <Bus className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.vehicles}</div>}
                        <p className="text-xs text-muted-foreground">Vehicles with scanned trips</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scanned Trips</CardTitle>
                    <CardDescription>View trips scanned by your company's vehicles</CardDescription>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input
                            type="text"
                            placeholder="Search trips..."
                            className="h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button type="submit" size="sm" className="h-9 px-4 py-2">
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="flex space-x-4">
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Booking #</TableHead>
                                            <TableHead>Passenger</TableHead>
                                            <TableHead>Route</TableHead>
                                            <TableHead>Vehicle</TableHead>
                                            <TableHead>Fare</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Journey Status</TableHead>
                                            <TableHead>Scanned In</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedBookings.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-24 text-center">
                                                    {searchQuery
                                                        ? "No trips found matching your search."
                                                        : "No scanned trips found for your company's vehicles."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedBookings.map((booking) => (
                                                <TableRow key={booking.id}>
                                                    <TableCell className="font-medium">{safeStr(booking.booking_number)}</TableCell>
                                                    <TableCell>{getFullName(booking.user)}</TableCell>
                                                    <TableCell>
                                                        {safeStr(booking.start_point?.name)} → {safeStr(booking.end_point?.name)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{safeStr(booking.vehicle?.name) || "N/A"}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {safeStr(booking.vehicle?.registration_number)}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {booking.has_percel ? (
                                                                <>
                                                                    <div className="font-medium">{safeAmount(getTotalFare(booking))}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        Fare: {safeAmount(booking.fare)} + Parcel: {safeAmount(booking.percel_fare)}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="font-medium">{safeAmount(booking.fare)}</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getStatusColor(booking.status || "", booking.used)}>
                                                            {getStatusText(booking)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getScanningStatusColor(booking)}>
                                                            {getScanningStatus(booking)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{safeDate(booking.scanned_in_at)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleViewBooking(booking)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between space-x-2 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredBookings.length)} of{" "}
                                        {filteredBookings.length} trips
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <div className="flex items-center space-x-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter((page) => {
                                                    // Show first page, last page, current page, and pages around current
                                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                                                })
                                                .map((page, index, array) => (
                                                    <div key={page} className="flex items-center">
                                                        {index > 0 && array[index - 1] !== page - 1 && (
                                                            <span className="px-2 text-muted-foreground">...</span>
                                                        )}
                                                        <Button
                                                            variant={currentPage === page ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setCurrentPage(page)}
                                                            className="w-8 h-8 p-0"
                                                        >
                                                            {page}
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Booking Details Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Trip Details</DialogTitle>
                        <DialogDescription>Trip #{safeStr(selectedBooking?.booking_number)}</DialogDescription>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-medium text-sm text-muted-foreground">Passenger Information</h3>
                                    <div className="flex items-center mt-1">
                                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <p className="font-semibold">{getFullName(selectedBooking.user)}</p>
                                    </div>
                                    <p className="text-sm mt-1">Type: {safeStr(selectedBooking.type)}</p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-sm text-muted-foreground">Trip Status</h3>
                                    <div className="flex space-x-2 items-center mt-1">
                                        <Badge
                                            variant="outline"
                                            className={getStatusColor(selectedBooking.status || "", selectedBooking.used)}
                                        >
                                            {getStatusText(selectedBooking)}
                                        </Badge>
                                        <Badge variant="outline" className={getScanningStatusColor(selectedBooking)}>
                                            {getScanningStatus(selectedBooking)}
                                        </Badge>
                                    </div>
                                    {selectedBooking.cancelled_at && (
                                        <p className="mt-2 text-sm text-red-500">Cancelled at: {safeDate(selectedBooking.cancelled_at)}</p>
                                    )}
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium text-sm text-muted-foreground mb-2">Trip Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center">
                                            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Route</p>
                                        </div>
                                        <p className="font-medium">
                                            {safeStr(selectedBooking.start_point?.name)} → {safeStr(selectedBooking.end_point?.name)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {safeStr(selectedBooking.start_point?.code)} → {safeStr(selectedBooking.end_point?.code)}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <Bus className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Vehicle</p>
                                        </div>
                                        <p className="font-medium">{safeStr(selectedBooking.vehicle?.name) || "Not assigned"}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {safeStr(selectedBooking.vehicle?.registration_number)}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Scanned In</p>
                                        </div>
                                        <p className="font-medium">{safeDate(selectedBooking.scanned_in_at)}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Scanned Out</p>
                                        </div>
                                        <p className="font-medium">{safeDate(selectedBooking.scanned_out_at)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-medium text-sm text-muted-foreground mb-2">Payment Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fare</p>
                                        <p className="font-medium text-lg">{safeAmount(selectedBooking.fare)}</p>
                                    </div>
                                    {selectedBooking.has_percel && (
                                        <>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Parcel Fare</p>
                                                <p className="font-medium">{safeAmount(selectedBooking.percel_fare)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Fare</p>
                                                <p className="font-medium text-lg text-green-600">
                                                    {safeAmount(getTotalFare(selectedBooking))}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <p className="text-sm text-muted-foreground">Scanned At</p>
                                        <p className="font-medium">{safeDate(selectedBooking.scanned_in_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
