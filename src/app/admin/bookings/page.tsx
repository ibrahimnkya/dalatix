"use client"

import { useState, useEffect } from "react"
import { Calendar, Search, Ticket, Eye, RefreshCcw, MapPin, Clock, User, Truck } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { getBookingsByDateRange, getBooking, updateBookingStatus } from "@/lib/services/booking"
import type { Booking } from "@/types/booking"

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [statusDialogOpen, setStatusDialogOpen] = useState(false)
    const [newStatus, setNewStatus] = useState<string>("")
    const [statusLoading, setStatusLoading] = useState(false)
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
        to: new Date(),
    })
    const [calendarOpen, setCalendarOpen] = useState(false)
    const { toast } = useToast()

    // Fetch bookings on initial load and when date range changes
    useEffect(() => {
        fetchBookings()
    }, [dateRange])

    const fetchBookings = async () => {
        setLoading(true)
        try {
            const startDate = format(dateRange.from, "yyyy-MM-dd")
            const endDate = format(dateRange.to, "yyyy-MM-dd")

            const response = await getBookingsByDateRange({ startDate, endDate })
            console.log("API Response:", response)

            // Always ensure bookings is an array
            const bookingsData = Array.isArray(response) ? response : []

            console.log("Processed bookings data:", bookingsData)
            setBookings(bookingsData)
        } catch (error) {
            console.error("Error fetching bookings:", error)
            toast({
                title: "Error",
                description: "Failed to load bookings. Please try again.",
                variant: "destructive",
            })
            setBookings([])
        } finally {
            setLoading(false)
        }
    }

    const handleViewBooking = async (id: number) => {
        try {
            const booking = await getBooking(id)
            if (booking) {
                console.log("Booking details:", booking)
                setSelectedBooking(booking)
                setViewDialogOpen(true)
            } else {
                toast({
                    title: "Error",
                    description: "Booking not found",
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Error fetching booking details:", error)
            toast({
                title: "Error",
                description: "Failed to load booking details",
                variant: "destructive",
            })
        }
    }

    const handleStatusChange = async () => {
        if (!selectedBooking || !newStatus) return

        setStatusLoading(true)
        try {
            const updatedBooking = await updateBookingStatus(selectedBooking.id, { status: newStatus })
            if (updatedBooking) {
                // Update the booking in the list
                setBookings((prevBookings) => prevBookings.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)))
                setSelectedBooking(updatedBooking)
                setStatusDialogOpen(false)
                toast({
                    title: "Success",
                    description: `Booking status updated to ${newStatus}`,
                })
            } else {
                throw new Error("Failed to update status")
            }
        } catch (error) {
            console.error("Error updating booking status:", error)
            toast({
                title: "Error",
                description: "Failed to update booking status",
                variant: "destructive",
            })
        } finally {
            setStatusLoading(false)
        }
    }

    const openStatusDialog = (booking: Booking) => {
        setSelectedBooking(booking)
        setNewStatus(booking.status)
        setStatusDialogOpen(true)
    }

    // Safely count bookings with a specific status
    const countBookingsByStatus = (status: string): number => {
        if (!Array.isArray(bookings)) return 0
        return bookings.filter((booking) => booking?.status === status).length
    }

    // Safely count used bookings
    const countUsedBookings = (): number => {
        if (!Array.isArray(bookings)) return 0
        return bookings.filter((booking) => booking?.used === true).length
    }

    // Add defensive checks before accessing properties
    const filteredBookings = Array.isArray(bookings)
        ? bookings.filter((booking) => {
            if (!booking) return false

            // Make sure booking and its nested properties exist before accessing
            const bookingNumber = booking?.booking_number || ""
            const userName = booking?.user ? `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim() : ""
            const vehicleName = booking?.vehicle?.name || ""
            const startPoint = booking?.start_point?.name || ""
            const endPoint = booking?.end_point?.name || ""

            const searchLower = searchQuery.toLowerCase()
            return (
                bookingNumber.toLowerCase().includes(searchLower) ||
                userName.toLowerCase().includes(searchLower) ||
                vehicleName.toLowerCase().includes(searchLower) ||
                startPoint.toLowerCase().includes(searchLower) ||
                endPoint.toLowerCase().includes(searchLower)
            )
        })
        : []

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            case "user":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
            case "cancelled":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            case "deactivated":
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
        }
    }

    // Helper function to safely access booking properties
    const safeStr = (value: any): string => {
        return value?.toString() || ""
    }

    // Helper function to safely format dates
    const safeDate = (dateStr: string | null) => {
        if (!dateStr) return "Not set"
        try {
            return new Date(dateStr).toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
            })
        } catch (e) {
            return "Invalid date"
        }
    }

    // Helper function to safely format currency
    const safeAmount = (amount: any) => {
        if (!amount) return "TZS0"
        const num = Number(amount)
        return isNaN(num) ? "TZS0" : `TZS${num.toLocaleString()}`
    }

    // Helper function to get full name
    const getFullName = (user: any) => {
        if (!user) return "Unknown"
        return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Unknown"
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Bookings Management</h2>
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
                    <Button variant="outline" onClick={fetchBookings}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{Array.isArray(bookings) ? bookings.length : 0}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Ticket className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{countBookingsByStatus("active")}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Used</CardTitle>
                        <Ticket className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{countUsedBookings()}</div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                        <Ticket className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{countBookingsByStatus("cancelled")}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bookings</CardTitle>
                    <CardDescription>Manage all bookings and reservations</CardDescription>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input
                            type="text"
                            placeholder="Search bookings..."
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
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBookings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                No bookings found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell className="font-medium">{safeStr(booking.booking_number)}</TableCell>
                                                <TableCell>{getFullName(booking.user)}</TableCell>
                                                <TableCell>
                                                    {booking.start_point?.name} → {booking.end_point?.name}
                                                </TableCell>
                                                <TableCell>{booking.vehicle?.name || "N/A"}</TableCell>
                                                <TableCell>{safeAmount(booking.fare)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getStatusColor(booking.status || "")}>
                                                        {booking.used
                                                            ? "Used"
                                                            : safeStr(booking.status).charAt(0).toUpperCase() + safeStr(booking.status).slice(1)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{safeDate(booking.created_at)}</TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleViewBooking(booking.id)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => openStatusDialog(booking)}>
                                                            <RefreshCcw className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Booking Details Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Booking Details</DialogTitle>
                        <DialogDescription>Booking #{safeStr(selectedBooking?.booking_number)}</DialogDescription>
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
                                    <p className="text-sm mt-1">Type: {selectedBooking.type}</p>
                                </div>
                                <div>
                                    <h3 className="font-medium text-sm text-muted-foreground">Booking Status</h3>
                                    <div className="flex space-x-2 items-center mt-1">
                                        <Badge variant="outline" className={getStatusColor(selectedBooking.status || "")}>
                                            {safeStr(selectedBooking.status).charAt(0).toUpperCase() +
                                                safeStr(selectedBooking.status).slice(1)}
                                        </Badge>
                                        {selectedBooking.used && (
                                            <Badge
                                                variant="outline"
                                                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                            >
                                                Used
                                            </Badge>
                                        )}
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
                                            {selectedBooking.start_point?.name} → {selectedBooking.end_point?.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedBooking.start_point?.code} → {selectedBooking.end_point?.code}
                                        </p>
                                    </div>
                                    <div>
                                        <div className="flex items-center">
                                            <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">Vehicle</p>
                                        </div>
                                        <p className="font-medium">{selectedBooking.vehicle?.name || "Not assigned"}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {selectedBooking.vehicle?.registration_number || ""}
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
                                        <div>
                                            <p className="text-sm text-muted-foreground">Parcel Fare</p>
                                            <p className="font-medium">{safeAmount(selectedBooking.percel_fare)}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-muted-foreground">Created At</p>
                                        <p className="font-medium">{safeDate(selectedBooking.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Expires At</p>
                                        <p className="font-medium">{safeDate(selectedBooking.expired_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                            Close
                        </Button>
                        <Button
                            onClick={() => {
                                setViewDialogOpen(false)
                                if (selectedBooking) {
                                    openStatusDialog(selectedBooking)
                                }
                            }}
                        >
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Status Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Update Booking Status</DialogTitle>
                        <DialogDescription>
                            Change the status for booking #{safeStr(selectedBooking?.booking_number)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Current Status</p>
                            <Badge variant="outline" className={selectedBooking ? getStatusColor(selectedBooking.status || "") : ""}>
                                {selectedBooking
                                    ? safeStr(selectedBooking.status).charAt(0).toUpperCase() + safeStr(selectedBooking.status).slice(1)
                                    : ""}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">New Status</p>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a new status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="deactivated">Deactivated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleStatusChange} disabled={statusLoading}>
                            {statusLoading ? "Updating..." : "Update Status"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
