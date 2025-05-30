import type { BookingStatusUpdateRequest, BookingFilters } from "@/types/booking"

// Helper function to get user permissions from localStorage
function getUserPermissions() {
    if (typeof window === "undefined") return { companyId: null, roles: [] }

    try {
        const storedCompanyId = localStorage.getItem("user_company_id")
        const storedRoles = localStorage.getItem("user_roles")

        return {
            companyId: storedCompanyId ? Number.parseInt(storedCompanyId, 10) : null,
            roles: storedRoles ? JSON.parse(storedRoles) : [],
        }
    } catch (error) {
        console.error("Error reading user permissions:", error)
        return { companyId: null, roles: [] }
    }
}

// Helper function to check if user is a Bus Owner
function isBusOwner(roles: string[]): boolean {
    return roles.some((role) => role.toLowerCase() === "bus owner" || role.toLowerCase() === "bus_owner")
}

/**
 * Get bookings by date range with automatic company filtering for Bus Owners
 */
export async function getBookingsByDateRange({
                                                 startDate,
                                                 endDate,
                                                 paginate = false,
                                                 companyId,
                                                 status,
                                                 used,
                                             }: BookingFilters = {}) {
    const params = new URLSearchParams()

    if (startDate) params.set("start_date", startDate)
    if (endDate) params.set("end_date", endDate)
    if (paginate !== undefined) params.set("paginate", String(paginate))
    if (status) params.set("status", status)
    if (used !== undefined) params.set("used", String(used))

    // Get user permissions and auto-apply company filtering for Bus Owners
    const userPermissions = getUserPermissions()
    const userIsBusOwner = isBusOwner(userPermissions.roles)

    // For Bus Owners, always filter by their company and only show completed/used bookings
    if (userIsBusOwner && userPermissions.companyId) {
        params.set("company_id", String(userPermissions.companyId))
        // Override status and used for Bus Owners to ensure they only see completed trips
        params.set("status", "completed")
        params.set("used", "true")
    } else if (companyId) {
        // For non-Bus Owners, use the provided companyId if any
        params.set("company_id", String(companyId))
    }

    try {
        console.log(`Fetching bookings with params: ${params.toString()}`)
        console.log("User permissions:", userPermissions)
        console.log("Is Bus Owner:", userIsBusOwner)

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
 * Get all bookings with automatic company filtering for Bus Owners
 */
export async function getBookings({ status, paginate = false, page, companyId, used }: BookingFilters = {}) {
    const params = new URLSearchParams()

    if (status) params.set("status", status)
    if (paginate !== undefined) params.set("paginate", String(paginate))
    if (page) params.set("page", String(page))
    if (used !== undefined) params.set("used", String(used))

    // Get user permissions and auto-apply company filtering for Bus Owners
    const userPermissions = getUserPermissions()
    const userIsBusOwner = isBusOwner(userPermissions.roles)

    // For Bus Owners, always filter by their company and only show completed/used bookings
    if (userIsBusOwner && userPermissions.companyId) {
        params.set("company_id", String(userPermissions.companyId))
        // Override status and used for Bus Owners to ensure they only see completed trips
        params.set("status", "completed")
        params.set("used", "true")
    } else if (companyId) {
        // For non-Bus Owners, use the provided companyId if any
        params.set("company_id", String(companyId))
    }

    try {
        console.log(`Fetching bookings with params: ${params.toString()}`)
        console.log("User permissions:", userPermissions)
        console.log("Is Bus Owner:", userIsBusOwner)

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
        console.log("Full API Response:", responseData)

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
 * Get bookings for a specific company (Bus Owner helper)
 */
export async function getCompanyBookings({
                                             companyId,
                                             startDate,
                                             endDate,
                                             usedOnly = false,
                                             paginate = false,
                                             page,
                                         }: {
    companyId: number
    startDate?: string
    endDate?: string
    usedOnly?: boolean
    paginate?: boolean
    page?: number
}) {
    const filters: BookingFilters = {
        companyId,
        paginate,
        page,
    }

    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate
    if (usedOnly) filters.used = true

    // Use date range endpoint if dates are provided, otherwise use general bookings endpoint
    if (startDate && endDate) {
        return getBookingsByDateRange(filters)
    } else {
        return getBookings(filters)
    }
}

/**
 * Get a single booking by ID with company access control
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
        let booking = null
        if (responseData && responseData.success && responseData.data) {
            booking = responseData.data
        } else {
            booking = responseData
        }

        // Apply company access control for Bus Owners
        if (booking) {
            const userPermissions = getUserPermissions()
            const userIsBusOwner = isBusOwner(userPermissions.roles)

            if (userIsBusOwner && userPermissions.companyId) {
                // Verify Bus Owner can only access bookings for their company's vehicles
                if (booking.vehicle && booking.vehicle.company_id !== userPermissions.companyId) {
                    console.warn("Access denied: Booking vehicle does not belong to user's company")
                    return null
                }

                // Verify it's a completed and used booking
                if (booking.status !== "completed" || !booking.used) {
                    console.warn("Access denied: Bus Owner can only view completed trips")
                    return null
                }
            }
        }

        return booking
    } catch (error) {
        console.error(`Error fetching booking ${id}:`, error)
        return null
    }
}

/**
 * Update booking status (restricted for Bus Owners)
 */
export async function updateBookingStatus(id: number, data: BookingStatusUpdateRequest) {
    // Check if user is Bus Owner and restrict access
    const userPermissions = getUserPermissions()
    const userIsBusOwner = isBusOwner(userPermissions.roles)

    if (userIsBusOwner) {
        throw new Error("Bus owners cannot modify booking status")
    }

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
