"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import {
    Loader2,
    AlertCircle,
    PieChartIcon,
    BarChartIcon,
    TrendingUp,
    Car,
    Users,
    MapPin,
    Calendar,
} from "lucide-react"
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    Sector,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts"

import { getBookingsByDateRange } from "@/lib/services/booking"
import { getVehicles } from "@/lib/services/vehicle"
import { getRoutes } from "@/lib/services/route"
import { getDashboardStats } from "@/lib/services/dashboard"
import { getUsers } from "@/lib/services/user"

interface RevenueDistributionProps {
    isMobile?: boolean
    startDate?: string
    endDate?: string
    companyId?: string
    className?: string
}

// Enhanced color palette for light and dark themes
const LIGHT_COLORS = [
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#06B6D4", // Cyan
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#EC4899", // Pink
    "#84CC16", // Lime
]

const DARK_COLORS = [
    "#818CF8", // Lighter Indigo
    "#A78BFA", // Lighter Violet
    "#22D3EE", // Lighter Cyan
    "#34D399", // Lighter Emerald
    "#FBBF24", // Lighter Amber
    "#F87171", // Lighter Red
    "#F472B6", // Lighter Pink
    "#A3E635", // Lighter Lime
]

// Real API service using the provided services
const getDistributionData = async (startDate?: string, endDate?: string, companyId?: string) => {
    try {
        // Parse company ID for consistent filtering
        const companyIdNumber = companyId && companyId !== "all" ? Number.parseInt(companyId) : undefined

        // Fetch all required data in parallel with company filtering
        const [bookingsData, vehiclesData, routesData, dashboardData, usersData] = await Promise.all([
            getBookingsByDateRange({ startDate, endDate, paginate: false }),
            getVehicles({ company_id: companyIdNumber, paginate: false }),
            getRoutes({ paginate: false }),
            getDashboardStats(companyId, startDate, endDate),
            getUsers({ paginate: false }),
        ])

        // Filter bookings by company if specified
        let filteredBookings = Array.isArray(bookingsData) ? bookingsData : []
        if (companyIdNumber && filteredBookings.length > 0) {
            filteredBookings = filteredBookings.filter((booking) => {
                return (
                    booking &&
                    (booking.company_id === companyIdNumber ||
                        booking.user?.company_id === companyIdNumber ||
                        booking.start_point?.company_id === companyIdNumber)
                )
            })
        }

        // Filter users by company if specified
        let filteredUsers = usersData
        if (companyIdNumber && usersData?.data) {
            const users = Array.isArray(usersData.data) ? usersData.data : usersData.data.data || []
            const companyUsers = users.filter((user) => user && user.company_id === companyIdNumber)
            filteredUsers = { ...usersData, data: companyUsers }
        }

        // Process bookings data for booking distribution
        const bookingDistribution = processBookingDistribution(filteredBookings)

        // Process vehicles data for vehicle distribution
        const vehicleDistribution = processVehicleDistribution(vehiclesData)

        // Process routes data for route revenue distribution
        const routeDistribution = await processRouteDistribution(routesData, filteredBookings, startDate, endDate)

        // Process revenue data from dashboard stats AND booking data
        const revenueDistribution = processRevenueDistribution(dashboardData, filteredBookings)

        // Process users data for agent distribution
        const agentDistribution = processAgentDistribution(filteredUsers, filteredBookings)

        return {
            success: true,
            data: {
                revenue: revenueDistribution,
                vehicles: vehicleDistribution,
                bookings: bookingDistribution,
                routes: routeDistribution,
                agents: agentDistribution,
            },
        }
    } catch (error) {
        console.error("Error fetching distribution data:", error)
        throw error
    }
}

// Helper function to process booking distribution
const processBookingDistribution = (bookingsData: any[]) => {
    if (!Array.isArray(bookingsData)) return []

    const statusCounts = bookingsData.reduce((acc, booking) => {
        if (!booking) return acc

        let status = "Unknown"
        if (booking.used) {
            status = "Used"
        } else if (booking.status) {
            status = booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
        }

        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {})

    const total = Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0)

    return Object.entries(statusCounts).map(([status, count]: [string, any]) => ({
        label: status,
        count: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}

// Helper function to process vehicle distribution
const processVehicleDistribution = (vehiclesData: any) => {
    const vehicles = Array.isArray(vehiclesData?.data)
        ? vehiclesData.data
        : Array.isArray(vehiclesData?.data?.data)
            ? vehiclesData.data.data
            : []

    if (!Array.isArray(vehicles)) return []

    const statusCounts = vehicles.reduce((acc, vehicle) => {
        if (!vehicle) return acc

        const status = vehicle.is_active ? "Active" : "Inactive"
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {})

    const total = Object.values(statusCounts).reduce((sum: number, count: any) => sum + count, 0)

    return Object.entries(statusCounts).map(([status, count]: [string, any]) => ({
        label: status,
        count: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
}

// Helper function to process route distribution
const processRouteDistribution = async (routesData: any, bookingsData: any[], startDate?: string, endDate?: string) => {
    const routes = Array.isArray(routesData?.data)
        ? routesData.data
        : Array.isArray(routesData?.data?.data)
            ? routesData.data.data
            : []

    if (!Array.isArray(routes) || !Array.isArray(bookingsData)) return []

    // Calculate revenue per route based on bookings
    const routeRevenue = bookingsData.reduce((acc, booking) => {
        if (!booking || !booking.start_point || !booking.end_point) return acc

        const routeKey = `${booking.start_point.name} - ${booking.end_point.name}`
        const fare = Number.parseFloat(booking.fare || "0")
        const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare || "0") : 0
        const totalFare = fare + parcelFare

        acc[routeKey] = (acc[routeKey] || 0) + totalFare
        return acc
    }, {})

    // Sort by revenue and get top 5
    const sortedRoutes = Object.entries(routeRevenue)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)

    const totalRevenue = Object.values(routeRevenue).reduce((sum: number, revenue: any) => sum + revenue, 0)

    return sortedRoutes.map(([routeName, revenue]: [string, any]) => ({
        label: routeName,
        count: revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    }))
}

// Helper function to process revenue distribution using actual booking data
const processRevenueDistribution = (dashboardData: any, bookingsData: any[]) => {
    if (!Array.isArray(bookingsData) || bookingsData.length === 0) {
        // Fallback to dashboard data if no bookings available
        if (!dashboardData?.data?.metrics) return []

        const totalRevenue = Number.parseFloat(dashboardData.data.metrics.total_revenue || "0")
        return [{ label: "Total Revenue", count: totalRevenue, percentage: 100 }]
    }

    // Calculate actual revenue by fare and parcel fare from booking data
    let fareRevenue = 0
    let parcelRevenue = 0

    bookingsData.forEach((booking) => {
        if (!booking) return

        const fare = Number.parseFloat(booking.fare || "0")
        const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare || "0") : 0

        fareRevenue += fare
        parcelRevenue += parcelFare
    })

    const totalRevenue = fareRevenue + parcelRevenue
    const revenueData = []

    // Add fare revenue
    if (fareRevenue > 0) {
        revenueData.push({
            label: "Passenger Fare Revenue",
            count: fareRevenue,
            percentage: totalRevenue > 0 ? Math.round((fareRevenue / totalRevenue) * 100) : 0,
        })
    }

    // Add parcel revenue
    if (parcelRevenue > 0) {
        revenueData.push({
            label: "Parcel Fare Revenue",
            count: parcelRevenue,
            percentage: totalRevenue > 0 ? Math.round((parcelRevenue / totalRevenue) * 100) : 0,
        })
    }

    // If no revenue data, show total from dashboard
    if (revenueData.length === 0 && totalRevenue === 0) {
        const dashboardRevenue = Number.parseFloat(dashboardData?.data?.metrics?.total_revenue || "0")
        if (dashboardRevenue > 0) {
            revenueData.push({
                label: "Total Revenue",
                count: dashboardRevenue,
                percentage: 100,
            })
        }
    }

    return revenueData.sort((a, b) => b.count - a.count) // Sort by revenue descending
}

// Helper function to process agent distribution
const processAgentDistribution = (usersData: any, bookingsData: any[]) => {
    const users = Array.isArray(usersData?.data)
        ? usersData.data
        : Array.isArray(usersData?.data?.data)
            ? usersData.data.data
            : []

    if (!Array.isArray(users) || !Array.isArray(bookingsData)) return []

    // Get agents only
    const agents = users.filter((user) => user && user.type === "agent")

    // Calculate revenue per agent based on bookings
    const agentRevenue = bookingsData.reduce((acc, booking) => {
        if (!booking || !booking.user) return acc

        const agentName = `${booking.user.first_name || ""} ${booking.user.last_name || ""}`.trim()
        if (!agentName) return acc

        const fare = Number.parseFloat(booking.fare || "0")
        const parcelFare = booking.has_percel ? Number.parseFloat(booking.percel_fare || "0") : 0
        const totalFare = fare + parcelFare

        acc[agentName] = (acc[agentName] || 0) + totalFare
        return acc
    }, {})

    // Sort by revenue and get top 5
    const sortedAgents = Object.entries(agentRevenue)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)

    const totalRevenue = Object.values(agentRevenue).reduce((sum: number, revenue: any) => sum + revenue, 0)

    return sortedAgents.map(([agentName, revenue]: [string, any]) => ({
        label: agentName || "Unknown Agent",
        count: revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    }))
}

export function RevenueDistribution({
                                        isMobile = false,
                                        startDate,
                                        endDate,
                                        companyId,
                                        className,
                                    }: RevenueDistributionProps) {
    const { theme, resolvedTheme } = useTheme()
    const [data, setData] = useState<any>({
        revenue: [],
        vehicles: [],
        bookings: [],
        routes: [],
        agents: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("revenue")
    const [activeIndex, setActiveIndex] = useState(0)
    const [chartType, setChartType] = useState<"doughnut" | "bar">("doughnut")

    // Get colors based on theme
    const isDark = resolvedTheme === "dark"
    const ENHANCED_COLORS = isDark ? DARK_COLORS : LIGHT_COLORS

    useEffect(() => {
        const fetchDistributionData = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await getDistributionData(startDate, endDate, companyId)

                if (response.success && response.data) {
                    const transformedData = {
                        revenue: response.data.revenue.map((item: any) => ({
                            name: item.label,
                            value: item.count,
                            percentage: item.percentage,
                        })),
                        vehicles: response.data.vehicles.map((item: any) => ({
                            name: item.label,
                            value: item.count,
                            percentage: item.percentage,
                        })),
                        bookings: response.data.bookings.map((item: any) => ({
                            name: item.label,
                            value: item.count,
                            percentage: item.percentage,
                        })),
                        routes: response.data.routes.map((item: any) => ({
                            name: item.label,
                            value: item.count,
                            percentage: item.percentage,
                        })),
                        agents: response.data.agents.map((item: any) => ({
                            name: item.label,
                            value: item.count,
                            percentage: item.percentage,
                        })),
                    }

                    setData(transformedData)
                } else {
                    throw new Error("Failed to fetch distribution data")
                }
            } catch (err) {
                console.error("Error fetching distribution data:", err)
                setError(err instanceof Error ? err.message : "An unknown error occurred")
                setData({
                    revenue: [],
                    vehicles: [],
                    bookings: [],
                    routes: [],
                    agents: [],
                })
            } finally {
                setLoading(false)
            }
        }

        fetchDistributionData()
    }, [startDate, endDate, companyId])

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0]
            return (
                <div className="bg-background/95 backdrop-blur-sm p-3 sm:p-4 border border-border rounded-lg sm:rounded-xl shadow-lg max-w-[250px] sm:max-w-none">
                    <p className="font-semibold text-foreground mb-1 text-sm sm:text-base truncate">{data.name}</p>
                    <div className="flex items-center gap-2 mb-1">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: data.color || ENHANCED_COLORS[0] }}
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground">
              {getValueLabel()}:<span className="font-medium ml-1 text-foreground">{formatValue(data.value)}</span>
            </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Percentage: <span className="font-medium text-foreground">{data.payload.percentage}%</span>
                    </p>
                </div>
            )
        }
        return null
    }

    const getValueLabel = () => {
        switch (activeTab) {
            case "revenue":
                return "Revenue"
            case "vehicles":
                return "Count"
            case "bookings":
                return "Bookings"
            case "routes":
                return "Revenue"
            case "agents":
                return "Revenue"
            default:
                return "Value"
        }
    }

    const formatValue = (value: number) => {
        switch (activeTab) {
            case "revenue":
            case "routes":
            case "agents":
                if (value >= 1000000000) {
                    return `TZS ${(value / 1000000000).toFixed(1)}B`
                } else if (value >= 1000000) {
                    return `TZS ${(value / 1000000).toFixed(1)}M`
                } else if (value >= 1000) {
                    return `TZS ${(value / 1000).toFixed(1)}K`
                } else {
                    return `TZS ${value.toLocaleString()}`
                }
            case "bookings":
                return value.toLocaleString()
            case "vehicles":
                return `${value} units`
            default:
                return value.toLocaleString()
        }
    }

    const getTotalValue = () => {
        if (!data || !data[activeTab]) return 0
        return data[activeTab].reduce((sum: number, entry: any) => sum + entry.value, 0)
    }

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props

        return (
            <g>
                <text x={cx} y={cy - 10} textAnchor="middle" className="fill-muted-foreground text-xs sm:text-sm font-medium">
                    {payload.name}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" className="fill-foreground text-sm sm:text-lg font-bold">
                    {formatValue(value)}
                </text>
                <text x={cx} y={cy + 30} textAnchor="middle" className="fill-muted-foreground text-xs sm:text-sm">
                    {(percent * 100).toFixed(1)}%
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 6}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 8}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
            </g>
        )
    }

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index)
    }

    const getTabIcon = (tab: string) => {
        switch (tab) {
            case "revenue":
                return <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            case "vehicles":
                return <Car className="h-3 w-3 sm:h-4 sm:w-4" />
            case "bookings":
                return <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            case "routes":
                return <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            case "agents":
                return <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            default:
                return null
        }
    }

    const renderChart = (dataKey: string) => {
        const chartData = data[dataKey] || []

        if (chartData.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                        <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                        <p className="text-sm sm:text-base">No {dataKey} data available</p>
                    </div>
                </div>
            )
        }

        if (chartType === "doughnut") {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {ENHANCED_COLORS.map((color, index) => (
                                <linearGradient
                                    key={`gradient-${dataKey}-${index}`}
                                    id={`gradient-${dataKey}-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 50 : 85}
                            outerRadius={isMobile ? 80 : 125}
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                            paddingAngle={3}
                        >
                            {chartData.map((entry: any, index: number) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={`url(#gradient-${dataKey}-${index % ENHANCED_COLORS.length})`}
                                    stroke={ENHANCED_COLORS[index % ENHANCED_COLORS.length]}
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            layout={isMobile ? "horizontal" : "vertical"}
                            verticalAlign={isMobile ? "bottom" : "middle"}
                            align={isMobile ? "center" : "right"}
                            wrapperStyle={isMobile ? { fontSize: 10, paddingTop: 15 } : { fontSize: 12, paddingLeft: 20 }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            )
        } else {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: isMobile ? 10 : 30,
                            left: isMobile ? 10 : 50,
                            bottom: isMobile ? 60 : 60,
                        }}
                        barSize={isMobile ? 20 : 35}
                    >
                        <defs>
                            {ENHANCED_COLORS.map((color, index) => (
                                <linearGradient
                                    key={`barGradient-${dataKey}-${index}`}
                                    id={`barGradient-${dataKey}-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            opacity={0.3}
                            vertical={false}
                            stroke={isDark ? "#374151" : "#E5E7EB"}
                        />
                        <XAxis
                            dataKey="name"
                            angle={isMobile ? -45 : -30}
                            textAnchor="end"
                            height={isMobile ? 80 : 80}
                            tick={{ fontSize: isMobile ? 9 : 12, fill: isDark ? "#9CA3AF" : "#6B7280" }}
                            tickLine={false}
                            axisLine={{ stroke: isDark ? "#374151" : "#E5E7EB", strokeWidth: 1 }}
                        />
                        <YAxis
                            tickFormatter={(value) => {
                                if (activeTab === "vehicles" || activeTab === "bookings") {
                                    return value.toString()
                                }
                                return `${(value / 1000000).toFixed(1)}M`
                            }}
                            width={isMobile ? 40 : 70}
                            tick={{ fontSize: isMobile ? 9 : 12, fill: isDark ? "#9CA3AF" : "#6B7280" }}
                            tickLine={false}
                            axisLine={{ stroke: isDark ? "#374151" : "#E5E7EB", strokeWidth: 1 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={`url(#barGradient-${dataKey}-${index % ENHANCED_COLORS.length})`} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )
        }
    }

    return (
        <Card className={`${className || "col-span-1 lg:col-span-2"} bg-card border-border shadow-lg`}>
            <CardHeader className="bg-card border-b border-border">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-2xl font-bold text-foreground">Business Analytics Overview</CardTitle>
                        <CardDescription className="text-muted-foreground text-sm sm:text-base">
                            Comprehensive breakdown of revenue, vehicles, bookings, routes and agents performance
                        </CardDescription>
                    </div>
                    <button
                        onClick={() => setChartType(chartType === "doughnut" ? "bar" : "doughnut")}
                        className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2 sm:px-4 rounded-lg bg-background hover:bg-accent border border-border transition-all duration-200 shadow-sm hover:shadow-md text-foreground"
                    >
                        {chartType === "doughnut" ? (
                            <>
                                <BarChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Bar Chart</span>
                                <span className="sm:hidden">Bar</span>
                            </>
                        ) : (
                            <>
                                <PieChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Doughnut Chart</span>
                                <span className="sm:hidden">Pie</span>
                            </>
                        )}
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64 sm:h-96">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-muted-foreground text-sm sm:text-base">Loading analytics data...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 sm:h-96 text-center p-6">
                        <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
                        <div className="text-destructive mb-2 text-lg sm:text-xl font-semibold">Data Unavailable</div>
                        <p className="text-muted-foreground text-sm:text-base">{error}</p>
                    </div>
                ) : (
                    <Tabs defaultValue="revenue" className="space-y-4 sm:space-y-6" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-5 bg-muted p-1 rounded-lg sm:rounded-xl h-auto">
                            <TabsTrigger
                                value="revenue"
                                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 p-2 sm:p-3 text-xs sm:text-sm"
                            >
                                {getTabIcon("revenue")}
                                <span className="hidden xs:inline sm:inline">Revenue</span>
                                <span className="xs:hidden sm:hidden">Rev</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="vehicles"
                                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 p-2 sm:p-3 text-xs sm:text-sm"
                            >
                                {getTabIcon("vehicles")}
                                <span className="hidden xs:inline sm:inline">Vehicles</span>
                                <span className="xs:hidden sm:hidden">Cars</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="bookings"
                                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 p-2 sm:p-3 text-xs sm:text-sm"
                            >
                                {getTabIcon("bookings")}
                                <span className="hidden xs:inline sm:inline">Bookings</span>
                                <span className="xs:hidden sm:hidden">Book</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="routes"
                                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 p-2 sm:p-3 text-xs sm:text-sm"
                            >
                                {getTabIcon("routes")}
                                <span className="hidden xs:inline sm:inline">Routes</span>
                                <span className="xs:hidden sm:hidden">Rte</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="agents"
                                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200 p-2 sm:p-3 text-xs sm:text-sm"
                            >
                                {getTabIcon("agents")}
                                <span className="hidden xs:inline sm:inline">Agents</span>
                                <span className="xs:hidden sm:hidden">Agt</span>
                            </TabsTrigger>
                        </TabsList>

                        {["revenue", "vehicles", "bookings", "routes", "agents"].map((tab) => (
                            <TabsContent key={tab} value={tab} className="space-y-4">
                                <div className="h-[300px] sm:h-[350px] md:h-[450px] bg-background/50 rounded-lg sm:rounded-xl p-2 sm:p-4 border border-border">
                                    {renderChart(tab)}
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </CardContent>
        </Card>
    )
}
