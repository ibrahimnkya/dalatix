import type { BookingStatusUpdateRequest, BookingFilters } from "@/types/booking"

/**
 * Get bookings by date range
 */
export async function getBookingsByDateRange({ startDate, endDate, paginate = false }: BookingFilters = {}) {
    const params = new URLSearchParams()

    if (startDate) params.set("start_date", startDate)
    if (endDate) params.set("end_date", endDate)
    if (paginate !== undefined) params.set("paginate", String(paginate))

    try {
        console.log(`Fetching bookings with params: ${params.toString()}`)
        const response = await fetch(`/api/proxy/bookings/by_date_range?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Failed to fetch bookings" }))
            throw new Error(error.message || "Failed to fetch bookings")
        }

        const responseData = await response.json()
        console.log("Full API Response:", responseData)

        // Handle the specific API response structure
        if (responseData && responseData.success && responseData.data) {
            console.log("Extracted data from API response:", responseData.data)
            return responseData.data
        } else if (Array.isArray(responseData)) {
            return responseData
        } else {
            console.warn("Unexpected response format:", responseData)
            return []
        }
    } catch (error) {
        console.error("Error fetching bookings by date range:", error)
        return []
    }
}

/**
 * Get all bookings
 */
export async function getBookings({ status, paginate = false, page }: BookingFilters = {}) {
    const params = new URLSearchParams()

    if (status) params.set("status", status)
    if (paginate !== undefined) params.set("paginate", String(paginate))
    if (page) params.set("page", String(page))

    try {
        const response = await fetch(`/api/proxy/bookings?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Failed to fetch bookings" }))
            throw new Error(error.message || "Failed to fetch bookings")
        }

        const responseData = await response.json()

        // Handle the specific API response structure
        if (responseData && responseData.success && responseData.data) {
            return responseData.data
        } else if (Array.isArray(responseData)) {
            return responseData
        } else {
            console.warn("Unexpected response format:", responseData)
            return []
        }
    } catch (error) {
        console.error("Error fetching bookings:", error)
        return []
    }
}

/**
 * Get a single booking by ID
 */
export async function getBooking(id: number) {
    try {
        const response = await fetch(`/api/proxy/bookings/${id}`, {
            headers: {
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Failed to fetch booking" }))
            throw new Error(error.message || "Failed to fetch booking")
        }

        const responseData = await response.json()

        // Handle the specific API response structure
        if (responseData && responseData.success && responseData.data) {
            return responseData.data
        } else {
            return responseData
        }
    } catch (error) {
        console.error(`Error fetching booking ${id}:`, error)
        return null
    }
}

/**
 * Update booking status
 */
export async function updateBookingStatus(id: number, data: BookingStatusUpdateRequest) {
    try {
        const response = await fetch(`/api/proxy/bookings/${id}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Failed to update booking status" }))
            throw new Error(error.message || "Failed to update booking status")
        }

        const responseData = await response.json()

        // Handle the specific API response structure
        if (responseData && responseData.success && responseData.data) {
            return responseData.data
        } else {
            return responseData
        }
    } catch (error) {
        console.error(`Error updating booking status for ${id}:`, error)
        return null
    }
}

/**
 * Cancel a booking (convenience method)
 */
export async function cancelBooking(id: number) {
    return updateBookingStatus(id, { status: "cancelled" })
}

/**
 * Complete a booking (convenience method)
 */
export async function completeBooking(id: number) {
    return updateBookingStatus(id, { status: "completed" })
}
