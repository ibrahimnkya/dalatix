import {
    format,
    subDays,
    subMonths,
    subYears,
    eachWeekOfInterval,
    eachMonthOfInterval,
    eachQuarterOfInterval,
    eachYearOfInterval,
    addDays,
    parseISO,
    isValid,
} from "date-fns"
import type {
    DashboardResponse,
    TimeFrame,
    ChartData,
    RevenueChartData,
    BookingDistribution,
    ExportFormat,
    PaginationParams,
} from "@/types/dashboard"
import { validateToken } from "@/lib/auth"

export interface Company {
    id: number
    name: string
    email?: string
    phone_number?: string
    created_at: string
}

export interface DashboardStats {
    period: {
        start_date: string
        end_date: string
    }
    company: Company | null
    metrics: {
        total_revenue: string
        total_bookings: number
        total_active_vehicles: number
        average_fare: string
        revenue_per_vehicle: string
        bookings_per_day: string
    }
}

// Cache for API responses
const API_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Fetches dashboard statistics with proper API endpoints and company filtering
 */
export async function getDashboardStats(
    companyId?: string,
    startDate?: string,
    endDate?: string,
): Promise<DashboardResponse> {
    try {
        console.log("Fetching dashboard stats with params:", { companyId, startDate, endDate })

        // For admin users, if they want to see all companies data, use aggregated approach
        if (!companyId || companyId === "all") {
            return await getAggregatedDashboardStats(startDate, endDate)
        }

        // For specific company (admin selecting a company or bus owner), use the bus owner approach
        return await getBusOwnerDashboardStats(companyId, startDate, endDate)
    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        return {
            success: false,
            data: null,
            message: error instanceof Error ? error.message : "Failed to fetch dashboard statistics",
        }
    }
}

/**
 * Fetches aggregated dashboard statistics for all companies (admin view)
 */
export async function getAggregatedDashboardStats(startDate?: string, endDate?: string): Promise<DashboardResponse> {
    try {
        console.log("Fetching aggregated dashboard stats for all companies")

        // Initialize metrics with default values
        const metrics = {
            total_revenue: "0",
            total_bookings: 0,
            total_active_vehicles: 0,
            average_fare: "0",
            revenue_per_vehicle: "0",
            bookings_per_day: "0",
        }

        // Fetch all companies first
        let allCompanies: any[] = []
        try {
            const companiesResponse = await fetch("/api/proxy/companies")
            if (companiesResponse.ok) {
                const companiesData = await companiesResponse.json()
                if (companiesData.success && Array.isArray(companiesData.data)) {
                    allCompanies = companiesData.data
                }
            }
        } catch (error) {
            console.warn("Could not fetch companies:", error)
        }

        // Fetch bookings data for all companies
        let allBookings: any[] = []
        try {
            const params = new URLSearchParams()
            params.set("start_date", startDate || format(subDays(new Date(), 30), "yyyy-MM-dd"))
            params.set("end_date", endDate || format(new Date(), "yyyy-MM-dd"))
            params.set("paginate", "false")

            const bookingsResponse = await fetch(`/api/proxy/bookings/by_date_range?${params}`)
            if (bookingsResponse.ok) {
                const bookingsData = await bookingsResponse.json()
                if (bookingsData.success) {
                    if (bookingsData.data && bookingsData.data.data && Array.isArray(bookingsData.data.data)) {
                        allBookings = bookingsData.data.data
                    } else if (Array.isArray(bookingsData.data)) {
                        allBookings = bookingsData.data
                    }
                }
            }
        } catch (error) {
            console.warn("Could not fetch bookings data:", error)
        }

        // Filter bookings to only include scanned-in bookings (realistic data)
        const validBookings = allBookings.filter((booking) => booking.scanned_in_at)

        // Calculate metrics from all valid bookings
        metrics.total_bookings = validBookings.length

        // Calculate total revenue
        const totalRevenue = validBookings.reduce((sum, booking) => {
            const fare = Number.parseFloat(booking.fare || "0")
            const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare || "0") : 0
            return sum + fare + parcelFare
        }, 0)
        metrics.total_revenue = totalRevenue.toString()

        // Calculate average fare
        if (validBookings.length > 0) {
            metrics.average_fare = (totalRevenue / validBookings.length).toString()
        }

        // Fetch all vehicles across all companies
        let allVehicles: any[] = []
        try {
            const vehiclesResponse = await fetch("/api/proxy/vehicles?per_page=1000")
            if (vehiclesResponse.ok) {
                const vehiclesData = await vehiclesResponse.json()
                if (vehiclesData.success && Array.isArray(vehiclesData.data)) {
                    allVehicles = vehiclesData.data
                }
            }
        } catch (error) {
            console.warn("Could not fetch vehicles data:", error)
        }

        // Count active vehicles
        const activeVehicles = allVehicles.filter(
            (vehicle) =>
                vehicle.status === "active" || vehicle.is_active === true || vehicle.active === true || !vehicle.status,
        )
        metrics.total_active_vehicles = activeVehicles.length

        // Calculate revenue per vehicle
        if (activeVehicles.length > 0) {
            metrics.revenue_per_vehicle = (totalRevenue / activeVehicles.length).toString()
        }

        // Calculate bookings per day
        if (startDate && endDate) {
            const start = new Date(startDate)
            const end = new Date(endDate)
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
            metrics.bookings_per_day = (validBookings.length / daysDiff).toString()
        }

        const result = {
            success: true,
            data: {
                period: {
                    start_date: startDate || "",
                    end_date: endDate || "",
                },
                company: null, // No specific company for aggregated view
                metrics,
            },
            message: "Aggregated dashboard statistics fetched successfully",
        }

        console.log("Final aggregated dashboard stats result:", result)
        return result
    } catch (error) {
        console.error("Error fetching aggregated dashboard stats:", error)
        return {
            success: false,
            data: null,
            message: error instanceof Error ? error.message : "Failed to fetch aggregated dashboard statistics",
        }
    }
}

/**
 * Fetches dashboard statistics specifically for bus owners using the same filtering logic as bookings
 */
export async function getBusOwnerDashboardStats(
    companyId: string,
    startDate?: string,
    endDate?: string,
): Promise<DashboardResponse> {
    try {
        console.log("Fetching bus owner dashboard stats with params:", { companyId, startDate, endDate })

        // Initialize metrics with default values
        const metrics = {
            total_revenue: "0",
            total_bookings: 0,
            total_active_vehicles: 0,
            average_fare: "0",
            revenue_per_vehicle: "0",
            bookings_per_day: "0",
        }

        let company = null

        // Fetch company information
        try {
            const companyResponse = await fetch(`/api/proxy/companies/${companyId}`)
            if (companyResponse.ok) {
                const companyData = await companyResponse.json()
                if (companyData.success && companyData.data) {
                    company = companyData.data
                }
            }
        } catch (error) {
            console.warn("Could not fetch company data:", error)
        }

        // Get company vehicles first
        let companyVehicleIds: number[] = []
        try {
            const vehiclesResponse = await fetch(`/api/proxy/vehicles?company_id=${companyId}`)
            if (vehiclesResponse.ok) {
                const vehiclesData = await vehiclesResponse.json()
                if (vehiclesData.success && Array.isArray(vehiclesData.data)) {
                    companyVehicleIds = vehiclesData.data.map((vehicle: any) => vehicle.id)
                    metrics.total_active_vehicles = vehiclesData.data.filter(
                        (vehicle: any) =>
                            vehicle.status === "active" || vehicle.is_active === true || vehicle.active === true || !vehicle.status,
                    ).length
                }
            }
        } catch (error) {
            console.warn("Could not fetch company vehicles:", error)
        }

        // Fetch bookings data using the same approach as bookings page
        try {
            const params = new URLSearchParams()
            params.set("start_date", startDate || format(subDays(new Date(), 30), "yyyy-MM-dd"))
            params.set("end_date", endDate || format(new Date(), "yyyy-MM-dd"))
            params.set("paginate", "false")

            console.log("Fetching bookings with params:", params.toString())

            const bookingsResponse = await fetch(`/api/proxy/bookings/by_date_range?${params}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                cache: "no-store",
            })

            if (bookingsResponse.ok) {
                const bookingsData = await bookingsResponse.json()
                console.log("Bookings response for dashboard:", bookingsData)

                let bookings: any[] = []

                // Handle the API response structure
                if (bookingsData.success) {
                    if (bookingsData.data && bookingsData.data.data && Array.isArray(bookingsData.data.data)) {
                        bookings = bookingsData.data.data
                    } else if (Array.isArray(bookingsData.data)) {
                        bookings = bookingsData.data
                    }
                } else if (Array.isArray(bookingsData)) {
                    bookings = bookingsData
                }

                console.log("Raw bookings for dashboard:", bookings.length)

                // Filter bookings for bus owners: only show bookings scanned in by company vehicles
                if (companyVehicleIds.length > 0) {
                    const originalCount = bookings.length

                    bookings = bookings.filter((booking) => {
                        // Must be scanned in (scanned_in_at exists)
                        if (!booking.scanned_in_at) {
                            return false
                        }

                        // Must have a vehicle that scanned it in
                        if (!booking.vehicle_id) {
                            return false
                        }

                        // The vehicle that scanned it must belong to the company
                        return companyVehicleIds.includes(booking.vehicle_id)
                    })

                    console.log(`Filtered bookings for dashboard: ${originalCount} -> ${bookings.length} (company: ${companyId})`)
                }

                // Calculate metrics from filtered bookings
                metrics.total_bookings = bookings.length

                // Calculate total revenue from bookings
                const totalRevenue = bookings.reduce((sum, booking) => {
                    const fare = Number.parseFloat(booking.fare || "0")
                    const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare || "0") : 0
                    return sum + fare + parcelFare
                }, 0)
                metrics.total_revenue = totalRevenue.toString()

                // Calculate average fare
                if (bookings.length > 0) {
                    metrics.average_fare = (totalRevenue / bookings.length).toString()
                }

                // Calculate revenue per vehicle
                if (metrics.total_active_vehicles > 0) {
                    metrics.revenue_per_vehicle = (totalRevenue / metrics.total_active_vehicles).toString()
                }

                // Calculate bookings per day
                if (startDate && endDate) {
                    const start = new Date(startDate)
                    const end = new Date(endDate)
                    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    metrics.bookings_per_day = (bookings.length / daysDiff).toString()
                }
            }
        } catch (error) {
            console.warn("Could not fetch bookings data for dashboard:", error)
        }

        const result = {
            success: true,
            data: {
                period: {
                    start_date: startDate || "",
                    end_date: endDate || "",
                },
                company,
                metrics,
            },
            message: "Bus owner dashboard statistics fetched successfully",
        }

        console.log("Final bus owner dashboard stats result:", result)
        return result
    } catch (error) {
        console.error("Error fetching bus owner dashboard stats:", error)
        return {
            success: false,
            data: null,
            message: error instanceof Error ? error.message : "Failed to fetch bus owner dashboard statistics",
        }
    }
}

/**
 * Fetches a specific company by ID
 */
export async function getCompany(companyId: number): Promise<DashboardResponse> {
    try {
        const url = `/api/proxy/companies/${companyId}`
        console.log("Fetching company from:", url)

        // Check if we have cached data
        const cacheKey = url
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached company data")
            return cachedData.data
        }

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Failed to fetch company: ${response.status}`)
        }

        const data = await response.json()
        console.log("Company response:", data)

        // Cache the response
        API_CACHE.set(cacheKey, { data, timestamp: now })

        return data
    } catch (error) {
        console.error("Error fetching company:", error)
        throw error
    }
}

/**
 * Fetches companies data with caching
 */
export async function getCompanies() {
    try {
        const url = "/api/proxy/companies"

        // Check if we have cached data
        const cacheKey = url
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached companies data")
            return cachedData.data
        }

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Failed to fetch companies: ${response.status}`)
        }

        const data = await response.json()

        // Cache the response
        API_CACHE.set(cacheKey, { data, timestamp: now })

        return data
    } catch (error) {
        console.error("Error fetching companies:", error)
        throw error
    }
}

/**
 * Fetches revenue data for charts with proper company filtering
 */
export async function getRevenueData(
    startDate: string,
    endDate: string,
    companyId?: string,
    timeFrame: TimeFrame = "daily",
): Promise<{ success: boolean; data: RevenueChartData[]; message?: string }> {
    try {
        const queryParams = new URLSearchParams()

        queryParams.append("start_date", startDate)
        queryParams.append("end_date", endDate)
        queryParams.append("time_frame", timeFrame)

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
            console.log("Adding company_id to revenue request:", companyId)
        }

        const url = `/api/proxy/reports/revenue?${queryParams.toString()}`
        console.log("Fetching revenue data from:", url)

        // Check if we have cached data
        const cacheKey = url
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached revenue data")
            return cachedData.data
        }

        const response = await fetch(url)

        if (!response.ok) {
            return {
                success: false,
                data: [],
                message: `Failed to fetch revenue data: ${response.status}`,
            }
        }

        const data = await response.json()

        // Cache the response
        API_CACHE.set(cacheKey, { data, timestamp: now })

        return data
    } catch (error) {
        console.error("Error fetching revenue data:", error)
        // Return fallback with error message
        return {
            success: false,
            data: [],
            message: error instanceof Error ? error.message : "An unknown error occurred",
        }
    }
}

// Replace the getBookingsDistribution function with this version
export async function getBookingsDistribution(companyId?: string): Promise<{
    success: boolean
    data: {
        status: BookingDistribution[]
        routes: BookingDistribution[]
    } | null
    message?: string
}> {
    try {
        const queryParams = new URLSearchParams()

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
            console.log("Adding company_id to bookings distribution request:", companyId)
        }

        // Check if we have cached data
        const cacheKey = `/api/proxy/reports/bookings-distribution?${queryParams.toString()}`
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached bookings distribution data")
            return cachedData.data
        }

        // Try to fetch real data
        try {
            // First check if the endpoints exist by making a HEAD request
            const checkEndpoint = await fetch("/api/proxy/reports/bookings-by-status", { method: "HEAD" })

            if (!checkEndpoint.ok) {
                return {
                    success: false,
                    data: null,
                    message: "Booking distribution data is not available at this time.",
                }
            }

            // If endpoint exists, proceed with actual data fetching
            const statusUrl = `/api/proxy/reports/bookings-by-status?${queryParams.toString()}`
            const statusResponse = await fetch(statusUrl)
            if (!statusResponse.ok) {
                throw new Error(`Failed to fetch bookings by status: ${statusResponse.status}`)
            }
            const statusData = await statusResponse.json()

            // Fetch routes with company filter
            const routesUrl = `/api/proxy/routes?paginate=false&${queryParams.toString()}`
            const routesResponse = await fetch(routesUrl)
            if (!routesResponse.ok) {
                throw new Error(`Failed to fetch routes: ${routesResponse.status}`)
            }
            const routesData = await routesResponse.json()

            // Fetch bookings by route with company filter
            const routeBookingsUrl = `/api/proxy/reports/bookings-by-route?${queryParams.toString()}`
            const routeBookingsResponse = await fetch(routeBookingsUrl)
            if (!routeBookingsResponse.ok) {
                throw new Error(`Failed to fetch bookings by route: ${routeBookingsResponse.status}`)
            }
            const routeBookingsData = await routeBookingsResponse.json()

            // Process the data
            const statusDistribution = statusData.data.map((item: any) => ({
                label: item.status,
                count: item.count,
            }))

            // Create a map of route IDs to route names
            const routeMap = new Map()
            if (routesData.success && Array.isArray(routesData.data)) {
                routesData.data.forEach((route: any) => {
                    routeMap.set(route.id, route.name)
                })
            }

            // Map route bookings data to distribution format
            const routeDistribution = routeBookingsData.data.map((item: any) => ({
                label: routeMap.get(item.route_id) || `Route ${item.route_id}`,
                count: item.count,
            }))

            // Sort by count in descending order and limit to top 5 routes
            const topRoutes = [...routeDistribution].sort((a, b) => b.count - a.count).slice(0, 5)

            // Calculate total for "Other" category
            const topRouteIds = new Set(topRoutes.map((r) => r.label))
            const otherRoutesCount = routeDistribution
                .filter((r) => !topRouteIds.has(r.label))
                .reduce((sum, route) => sum + route.count, 0)

            // Add "Other" category if there are more than 5 routes
            if (routeDistribution.length > 5 && otherRoutesCount > 0) {
                topRoutes.push({
                    label: "Other Routes",
                    count: otherRoutesCount,
                })
            }

            const result = {
                success: true,
                data: {
                    status: statusDistribution,
                    routes: topRoutes,
                },
            }

            // Cache the response
            API_CACHE.set(cacheKey, { data: result, timestamp: now })

            return result
        } catch (error) {
            console.error("Error fetching distribution data:", error)
            return {
                success: false,
                data: null,
                message: "The booking distribution data could not be loaded. Please try again later.",
            }
        }
    } catch (error) {
        console.error("Error in getBookingsDistribution:", error)
        return {
            success: false,
            data: null,
            message: "An unexpected error occurred while loading distribution data.",
        }
    }
}

// Add a new function to get revenue distributions from the stats endpoint
export async function getRevenueDistribution(
    startDate?: string,
    endDate?: string,
    companyId?: string,
): Promise<{
    success: boolean
    data: {
        revenue: BookingDistribution[]
        vehicles: BookingDistribution[]
    } | null
    message?: string
}> {
    try {
        const queryParams = new URLSearchParams()

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
            console.log("Adding company_id to revenue distribution request:", companyId)
        }

        if (startDate) {
            queryParams.append("start_date", startDate)
        }

        if (endDate) {
            queryParams.append("end_date", endDate)
        }

        const url = `/api/proxy/reports/stats?${queryParams.toString()}`
        console.log("Fetching revenue distribution from:", url)

        // Check cache
        const cacheKey = url + "_distribution"
        const cachedData = API_CACHE.get(cacheKey)
        const now = Date.now()

        if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            console.log("Using cached revenue distribution data")
            return cachedData.data
        }

        const response = await fetch(url)

        if (!response.ok) {
            return {
                success: false,
                data: null,
                message: `Failed to fetch revenue statistics: ${response.status}`,
            }
        }

        const statsData = await response.json()

        if (!statsData.success || !statsData.data) {
            return {
                success: false,
                data: null,
                message: statsData.message || "No revenue data available",
            }
        }

        // Get company-specific data if available
        let companiesData: any[] = []

        if (!companyId || companyId === "all") {
            // If no specific company is selected, try to get company breakdown
            try {
                const companiesResponse = await fetch("/api/proxy/reports/revenue-by-company")
                if (companiesResponse.ok) {
                    const companiesResult = await companiesResponse.json()
                    if (companiesResult.success && Array.isArray(companiesResult.data)) {
                        companiesData = companiesResult.data
                    }
                }
            } catch (error) {
                console.warn("Could not fetch company revenue breakdown:", error)
            }
        }

        // Create revenue distribution data
        let revenueDistribution: BookingDistribution[] = []

        if (companiesData.length > 0) {
            // If we have company breakdown, use it
            revenueDistribution = companiesData
                .map((company) => ({
                    label: company.name || `Company ${company.id}`,
                    count: Number.parseFloat(company.revenue || "0"),
                }))
                .sort((a, b) => b.count - a.count)

            // Limit to top 5 companies
            if (revenueDistribution.length > 5) {
                const topCompanies = revenueDistribution.slice(0, 5)
                const otherRevenue = revenueDistribution.slice(5).reduce((sum, company) => sum + company.count, 0)

                revenueDistribution = [...topCompanies, { label: "Other Companies", count: otherRevenue }]
            }
        } else {
            // If no company breakdown, create a simple revenue vs target distribution
            const actualRevenue = Number.parseFloat(statsData.data.metrics.total_revenue || "0")
            const targetRevenue = actualRevenue * 1.2 // Example target (20% higher)

            revenueDistribution = [
                { label: "Actual Revenue", count: actualRevenue },
                { label: "Target Revenue", count: targetRevenue },
            ]
        }

        // Create vehicle distribution data
        // This could be active vs inactive vehicles, or vehicles by type
        const vehicleDistribution: BookingDistribution[] = [
            {
                label: "Active Vehicles",
                count: statsData.data.metrics.total_active_vehicles || 0,
            },
        ]

        // Try to get inactive vehicles count if available
        try {
            const vehiclesUrl =
                companyId && companyId !== "all"
                    ? `/api/proxy/vehicles/stats?company_id=${companyId}`
                    : "/api/proxy/vehicles/stats"
            const vehiclesResponse = await fetch(vehiclesUrl)
            if (vehiclesResponse.ok) {
                const vehiclesData = await vehiclesResponse.json()
                if (vehiclesData.success && vehiclesData.data) {
                    // Add inactive vehicles if available
                    if (vehiclesData.data.total_inactive_vehicles) {
                        vehicleDistribution.push({
                            label: "Inactive Vehicles",
                            count: vehiclesData.data.total_inactive_vehicles,
                        })
                    }

                    // Add vehicles by type if available
                    if (vehiclesData.data.vehicles_by_type && Array.isArray(vehiclesData.data.vehicles_by_type)) {
                        vehiclesData.data.vehicles_by_type.forEach((item: any) => {
                            vehicleDistribution.push({
                                label: item.type || "Unknown Type",
                                count: item.count || 0,
                            })
                        })
                    }
                }
            }
        } catch (error) {
            console.warn("Could not fetch vehicle statistics:", error)
        }

        const result = {
            success: true,
            data: {
                revenue: revenueDistribution,
                vehicles: vehicleDistribution,
            },
        }

        // Cache the result
        API_CACHE.set(cacheKey, { data: result, timestamp: now })

        return result
    } catch (error) {
        console.error("Error fetching revenue distribution:", error)
        return {
            success: false,
            data: null,
            message: "Failed to load revenue distribution data.",
        }
    }
}

/**
 * Calculates growth rate by comparing current period with previous period
 */
export async function calculateGrowthRate(
    currentStartDate: string,
    currentEndDate: string,
    companyId?: string,
): Promise<{
    growthRate: number
    currentRevenue: number
    previousRevenue: number
    periodComparison: {
        current_period: number
        previous_period: number
        change_percentage: number
    }
}> {
    try {
        const currentStart = parseISO(currentStartDate)
        const currentEnd = parseISO(currentEndDate)
        const periodLength = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24))

        // Calculate previous period dates (same length, immediately before current period)
        const previousEnd = subDays(currentStart, 1)
        const previousStart = subDays(previousEnd, periodLength)

        console.log("Calculating growth rate for periods:", {
            current: { start: currentStartDate, end: currentEndDate },
            previous: { start: format(previousStart, "yyyy-MM-dd"), end: format(previousEnd, "yyyy-MM-dd") },
            companyId,
        })

        // Fetch current period revenue
        const currentStats = await getDashboardStats(companyId, currentStartDate, currentEndDate)

        // Fetch previous period revenue
        const previousStats = await getDashboardStats(
            companyId,
            format(previousStart, "yyyy-MM-dd"),
            format(previousEnd, "yyyy-MM-dd"),
        )

        const currentRevenue = Number.parseFloat(currentStats?.data?.metrics?.total_revenue || "0")
        const previousRevenue = Number.parseFloat(previousStats?.data?.metrics?.total_revenue || "0")

        console.log("Growth rate calculation data:", {
            currentRevenue,
            previousRevenue,
            currentSuccess: currentStats?.success,
            previousSuccess: previousStats?.success,
        })

        // Calculate growth rate
        let growthRate = 0
        if (previousRevenue > 0) {
            growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100
        } else if (currentRevenue > 0) {
            growthRate = 100 // 100% growth if previous was 0 but current has revenue
        }

        const periodComparison = {
            current_period: currentRevenue,
            previous_period: previousRevenue,
            change_percentage: growthRate,
        }

        return {
            growthRate,
            currentRevenue,
            previousRevenue,
            periodComparison,
        }
    } catch (error) {
        console.error("Error calculating growth rate:", error)
        return {
            growthRate: 0,
            currentRevenue: 0,
            previousRevenue: 0,
            periodComparison: {
                current_period: 0,
                previous_period: 0,
                change_percentage: 0,
            },
        }
    }
}

/**
 * Exports dashboard data to the specified format with company filtering
 */
export async function exportDashboardData(
    format: ExportFormat,
    startDate: string,
    endDate: string,
    companyId?: string,
): Promise<Blob | null> {
    try {
        const queryParams = new URLSearchParams()

        queryParams.append("start_date", startDate)
        queryParams.append("end_date", endDate)
        queryParams.append("format", format)

        if (companyId && companyId !== "all") {
            queryParams.append("company_id", companyId)
            console.log("Adding company_id to export request:", companyId)
        }

        const url = `/api/proxy/reports/export?${queryParams.toString()}`
        console.log("Exporting dashboard data from:", url)

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Failed to export dashboard data: ${response.status}`)
        }

        return await response.blob()
    } catch (error) {
        console.error("Error exporting dashboard data:", error)
        return null
    }
}

/**
 * Generates time frame data for charts
 */
export function generateTimeFrameData(
    timeFrame: TimeFrame,
    startDate: Date,
    endDate: Date,
): { labels: string[]; intervals: Date[] } {
    let intervals: Date[] = []

    switch (timeFrame) {
        case "daily":
            // Generate daily intervals
            intervals = Array.from(
                { length: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 },
                (_, i) => addDays(startDate, i),
            )
            return {
                labels: intervals.map((date) => format(date, "MMM dd")),
                intervals,
            }
        case "weekly":
            intervals = eachWeekOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => `Week ${format(date, "w")}`),
                intervals,
            }
        case "monthly":
            intervals = eachMonthOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => format(date, "MMM yyyy")),
                intervals,
            }
        case "quarterly":
            intervals = eachQuarterOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => `Q${Math.ceil((date.getMonth() + 1) / 3)} ${format(date, "yyyy")}`),
                intervals,
            }
        case "yearly":
            intervals = eachYearOfInterval({ start: startDate, end: endDate })
            return {
                labels: intervals.map((date) => format(date, "yyyy")),
                intervals,
            }
        default:
            return { labels: [], intervals: [] }
    }
}

/**
 * Formats data for pie charts
 */
export function generatePieChartData(data: Record<string, number>): ChartData[] {
    return Object.entries(data).map(([name, value]) => ({
        name,
        value,
    }))
}

/**
 * Gets the default date range
 */
export function getDefaultDateRange() {
    return {
        from: subMonths(new Date(), 1),
        to: new Date(),
    }
}

/**
 * Returns a list of preset date ranges
 */
export function getPresetDateRanges() {
    const today = new Date()

    return [
        {
            name: "Today",
            from: today,
            to: today,
        },
        {
            name: "Yesterday",
            from: subDays(today, 1),
            to: subDays(today, 1),
        },
        {
            name: "Last 7 days",
            from: subDays(today, 6),
            to: today,
        },
        {
            name: "Last 30 days",
            from: subDays(today, 29),
            to: today,
        },
        {
            name: "Last 90 days",
            from: subDays(today, 89),
            to: today,
        },
        {
            name: "Last 12 months",
            from: subYears(today, 1),
            to: today,
        },
    ]
}

/**
 * Validates a date string
 */
export function isValidDateString(dateString: string): boolean {
    if (!dateString) return false
    const parsedDate = parseISO(dateString)
    return isValid(parsedDate)
}

/**
 * Validates a date range
 */
export function validateDateRange(startDate?: string, endDate?: string): boolean {
    if (!startDate || !endDate) return false

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    if (!isValid(start) || !isValid(end)) return false

    // Ensure start date is before or equal to end date
    return start <= end
}

/**
 * Helper function to create pagination parameters
 */
export function createPaginationParams(page = 1, limit = 10): PaginationParams {
    return {
        page: Math.max(1, page), // Ensure page is at least 1
        limit: Math.min(Math.max(1, limit), 100), // Ensure limit is between 1 and 100
    }
}

/**
 * Set up token validation
 */
export const setupTokenValidation = () => {
    // Check token validity on page load
    validateToken()

    // Set up interval to check token validity (every 5 minutes)
    const intervalId = setInterval(
        () => {
            validateToken()
        },
        5 * 60 * 1000,
    )

    return () => {
        clearInterval(intervalId)
    }
}

/**
 * Clears the API cache
 */
export function clearApiCache(): void {
    API_CACHE.clear()
    console.log("API cache cleared")
}
