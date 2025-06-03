"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { RevenueDistribution } from "@/components/dashboard/revenue-distribution"
import { getDashboardStats } from "@/lib/services/dashboard"
import { getCompanies } from "@/lib/services/company"
import { LoadingSpinner } from "@/components/loading-spinner"
import { usePermissions } from "@/hooks/use-permissions"
import { TrendingUp, TrendingDown, DollarSign, Users, Car, Calendar, Building2, AlertCircle } from "lucide-react"
import { format, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"

interface DashboardStats {
    total_revenue: string | number
    total_bookings: string | number
    total_active_vehicles: string | number
    average_fare: string | number
    revenue_per_vehicle: string | number
    bookings_per_day: string | number
    growth_rate?: string | number
}

interface Company {
    id: number
    name: string
    email: string
    phone: string
    address: string
}

export default function BusOwnerDashboard() {
    const { companyId, hasRole } = usePermissions()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [companies, setCompanies] = useState<Company[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    })

    console.log("Bus Owner Dashboard Debug Info:", {
        isBusOwner: hasRole("Bus Owner"),
        companyId,
        dateRange,
    })

    const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
        setDateRange(newDateRange)
    }

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!hasRole("Bus Owner")) {
                setError("Access denied: Bus owner permissions required")
                setLoading(false)
                return
            }

            if (!companyId) {
                setError("No company assigned to this bus owner account")
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                const startDate = dateRange?.from
                    ? format(dateRange.from, "yyyy-MM-dd")
                    : format(subDays(new Date(), 30), "yyyy-MM-dd")
                const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")

                console.log("Fetching bus owner dashboard data:", {
                    companyId,
                    startDate,
                    endDate,
                })

                // Fetch dashboard stats with company filter
                const statsResponse = await getDashboardStats(companyId.toString(), startDate, endDate)
                console.log("Bus owner stats response:", statsResponse)

                if (statsResponse.success && statsResponse.data?.metrics) {
                    setStats(statsResponse.data.metrics)
                } else {
                    throw new Error(statsResponse.message || "Failed to fetch dashboard statistics")
                }

                // Fetch company information
                const companiesResponse = await getCompanies()
                if (companiesResponse.success && companiesResponse.data) {
                    // Filter to only show the bus owner's company
                    const userCompany = companiesResponse.data.find((company: Company) => company.id === companyId)
                    setCompanies(userCompany ? [userCompany] : [])
                }
            } catch (err) {
                console.error("Error fetching bus owner dashboard data:", err)
                setError(err instanceof Error ? err.message : "Failed to load dashboard data")
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [dateRange, companyId, hasRole])

    if (!hasRole("Bus Owner")) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground">Bus owner permissions required to access this dashboard.</p>
                </div>
            </div>
        )
    }

    if (!companyId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Company Assigned</h2>
                    <p className="text-muted-foreground">
                        Please contact your administrator to assign a company to your account.
                    </p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </div>
        )
    }

    const formatCurrency = (value: string | number) => {
        const numValue = typeof value === "string" ? Number.parseFloat(value) : value
        if (isNaN(numValue)) return "TZS 0"
        return new Intl.NumberFormat("en-TZ", {
            style: "currency",
            currency: "TZS",
            minimumFractionDigits: 0,
        }).format(numValue)
    }

    const formatNumber = (value: string | number) => {
        const numValue = typeof value === "string" ? Number.parseFloat(value) : value
        if (isNaN(numValue)) return "0"
        return new Intl.NumberFormat().format(numValue)
    }

    const safeParseNumber = (value: string | number | undefined): number => {
        if (value === undefined || value === null) return 0
        const numValue = typeof value === "string" ? Number.parseFloat(value) : value
        return isNaN(numValue) ? 0 : numValue
    }

    const growthRate = safeParseNumber(stats?.growth_rate)
    const isPositiveGrowth = growthRate > 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bus Owner Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your company's performance and key metrics</p>
                    {companies.length > 0 && (
                        <Badge variant="outline" className="mt-2">
                            <Building2 className="h-3 w-3 mr-1" />
                            {companies[0].name}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <CalendarDateRangePicker value={dateRange} onChange={handleDateRangeChange} showPresets={true} />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</div>
                        {growthRate !== 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                {isPositiveGrowth ? (
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                )}
                                <span className={isPositiveGrowth ? "text-green-500" : "text-red-500"}>
                  {Math.abs(growthRate).toFixed(1)}%
                </span>
                                from last period
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats?.total_bookings || 0)}</div>
                        <p className="text-xs text-muted-foreground">Bookings in selected period</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats?.total_active_vehicles || 0)}</div>
                        <p className="text-xs text-muted-foreground">Fleet size</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Fare</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.average_fare || 0)}</div>
                        <p className="text-xs text-muted-foreground">Per booking</p>
                    </CardContent>
                </Card>
            </div>

            {/* Additional Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue per Vehicle</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats?.revenue_per_vehicle || 0)}</div>
                        <p className="text-xs text-muted-foreground">Average revenue per vehicle</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Bookings</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats?.bookings_per_day || 0)}</div>
                        <p className="text-xs text-muted-foreground">Average bookings per day</p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Distribution */}
            <div className="grid gap-4 md:grid-cols-1">
                <RevenueDistribution
                    isMobile={false}
                    startDate={dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined}
                    endDate={dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined}
                    companyId={companyId?.toString()}
                    className="w-full"
                    isBusOwnerView={true}
                />
            </div>
        </div>
    )
}
