"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, LineChartIcon, BarChartIcon, AreaChartIcon } from "lucide-react"
import { format } from "date-fns"
import { getRevenueData } from "@/lib/services/dashboard"
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    ComposedChart,
    Scatter,
    ZAxis,
    Brush,
    Cell,
} from "recharts"
import { CHART_COLORS } from "@/constants/theme"
import { motion } from "framer-motion"

interface RevenueChartProps {
    startDate: Date
    endDate: Date
    isMobile?: boolean
}

type TimeFrame = "daily" | "weekly" | "monthly"
type ChartType = "line" | "area" | "bar" | "bubble" | "multi"

export function RevenueChart({ startDate, endDate, isMobile = false }: RevenueChartProps) {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("daily")
    const [chartType, setChartType] = useState<ChartType>("line")

    useEffect(() => {
        const fetchRevenueData = async () => {
            setLoading(true)
            setError(null)

            try {
                const startDateStr = format(startDate, "yyyy-MM-dd")
                const endDateStr = format(endDate, "yyyy-MM-dd")

                const response = await getRevenueData(startDateStr, endDateStr, undefined, activeTab as TimeFrame)

                if (response.success && Array.isArray(response.data)) {
                    // Enhance data with additional metrics for bubble chart
                    const enhancedData = response.data.map((item) => ({
                        ...item,
                        // Calculate average ticket price (revenue / bookings)
                        avgTicketPrice: item.bookings > 0 ? item.revenue / item.bookings : 0,
                        // Add a random growth rate for demonstration
                        growthRate: Math.random() * 20 - 10, // -10% to +10%
                    }))

                    setData(enhancedData)
                } else {
                    throw new Error(response.message || "Failed to fetch revenue data")
                }
            } catch (err) {
                console.error("Error fetching revenue data:", err)
                setError(err instanceof Error ? err.message : "An unknown error occurred")
            } finally {
                setLoading(false)
            }
        }

        fetchRevenueData()
    }, [startDate, endDate, activeTab])

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-4 border border-border rounded-md shadow-md">
                    <p className="font-medium text-sm mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            <span className="font-medium">{entry.name}: </span>
                            {entry.name.toLowerCase().includes("revenue")
                                ? `TZS ${Number(entry.value).toLocaleString()}`
                                : Number(entry.value).toLocaleString()}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    // Chart type selector
    const ChartTypeSelector = () => (
        <div className="flex flex-wrap gap-2 mb-4">
            <button
                onClick={() => setChartType("line")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center ${
                    chartType === "line" ? "bg-primary text-secondary font-medium" : "bg-muted hover:bg-muted/80"
                }`}
            >
                <LineChartIcon className="h-3.5 w-3.5 mr-1" />
                Curved Line
            </button>
            <button
                onClick={() => setChartType("area")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center ${
                    chartType === "area" ? "bg-primary text-secondary font-medium" : "bg-muted hover:bg-muted/80"
                }`}
            >
                <AreaChartIcon className="h-3.5 w-3.5 mr-1" />
                Area
            </button>
            <button
                onClick={() => setChartType("bar")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center ${
                    chartType === "bar" ? "bg-primary text-secondary font-medium" : "bg-muted hover:bg-muted/80"
                }`}
            >
                <BarChartIcon className="h-3.5 w-3.5 mr-1" />
                Bar
            </button>
            <button
                onClick={() => setChartType("bubble")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center ${
                    chartType === "bubble" ? "bg-primary text-secondary font-medium" : "bg-muted hover:bg-muted/80"
                }`}
            >
                <span className="h-3.5 w-3.5 mr-1 rounded-full border border-current inline-block"></span>
                Bubble
            </button>
            <button
                onClick={() => setChartType("multi")}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors flex items-center ${
                    chartType === "multi" ? "bg-primary text-secondary font-medium" : "bg-muted hover:bg-muted/80"
                }`}
            >
                <LineChartIcon className="h-3.5 w-3.5 mr-1" />
                Multi-Line
            </button>
        </div>
    )

    // Render the appropriate chart based on the selected type
    const renderChart = () => {
        const commonProps = {
            data,
            margin: {
                top: 5,
                right: isMobile ? 10 : 30,
                left: isMobile ? 0 : 20,
                bottom: isMobile ? 60 : 30,
            },
        }

        switch (chartType) {
            case "line":
                return (
                    <LineChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? "end" : "middle"}
                            height={isMobile ? 80 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke={CHART_COLORS.primary}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke={CHART_COLORS.blue}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue (TZS)"
                            stroke={CHART_COLORS.primary}
                            activeDot={{ r: 8, fill: CHART_COLORS.primary, stroke: "white", strokeWidth: 2 }}
                            strokeWidth={3}
                            dot={{ r: 4, fill: CHART_COLORS.primary, stroke: "white", strokeWidth: 2 }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="bookings"
                            name="Bookings"
                            stroke={CHART_COLORS.blue}
                            strokeWidth={2}
                            dot={{ r: 4, fill: CHART_COLORS.blue, stroke: "white", strokeWidth: 2 }}
                        />
                    </LineChart>
                )

            case "area":
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorBookingsArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? "end" : "middle"}
                            height={isMobile ? 80 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke={CHART_COLORS.primary}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke={CHART_COLORS.blue}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue (TZS)"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenueArea)"
                            activeDot={{ r: 8, fill: CHART_COLORS.primary, stroke: "white", strokeWidth: 2 }}
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="bookings"
                            name="Bookings"
                            stroke={CHART_COLORS.blue}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBookingsArea)"
                            activeDot={{ r: 6, fill: CHART_COLORS.blue, stroke: "white", strokeWidth: 2 }}
                        />
                    </AreaChart>
                )

            case "bar":
                return (
                    <BarChart {...commonProps} barSize={isMobile ? 15 : 20}>
                        <defs>
                            <linearGradient id="colorRevenueBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                            </linearGradient>
                            <linearGradient id="colorBookingsBar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.9} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0.6} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis
                            dataKey="date"
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? "end" : "middle"}
                            height={isMobile ? 80 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke={CHART_COLORS.primary}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke={CHART_COLORS.blue}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                        <Bar
                            yAxisId="left"
                            dataKey="revenue"
                            name="Revenue (TZS)"
                            fill="url(#colorRevenueBar)"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            yAxisId="right"
                            dataKey="bookings"
                            name="Bookings"
                            fill="url(#colorBookingsBar)"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                )

            case "bubble":
                return (
                    <ComposedChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorRevenueBubble" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? "end" : "middle"}
                            height={isMobile ? 80 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke={CHART_COLORS.primary}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <ZAxis range={[60, 400]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue Trend"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={2}
                            fillOpacity={0.3}
                            fill="url(#colorRevenueBubble)"
                        />
                        <Scatter yAxisId="left" name="Booking Volume" data={data} fill={CHART_COLORS.blue} shape="circle">
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.growthRate > 0 ? CHART_COLORS.green : CHART_COLORS.red}
                                    opacity={0.7}
                                />
                            ))}
                        </Scatter>
                    </ComposedChart>
                )

            case "multi":
                return (
                    <LineChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorRevenueMulti" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBookingsMulti" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAvgTicket" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                            dataKey="date"
                            angle={isMobile ? -45 : 0}
                            textAnchor={isMobile ? "end" : "middle"}
                            height={isMobile ? 80 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke={CHART_COLORS.primary}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke={CHART_COLORS.blue}
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickLine={false}
                            axisLine={{ stroke: "#E5E7EB" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                        <Brush
                            dataKey="date"
                            height={30}
                            stroke={CHART_COLORS.primary}
                            travellerWidth={10}
                            startIndex={Math.max(0, data.length - 10)}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            name="Revenue (TZS)"
                            stroke={CHART_COLORS.primary}
                            activeDot={{ r: 8, fill: CHART_COLORS.primary, stroke: "white", strokeWidth: 2 }}
                            strokeWidth={3}
                            dot={{ r: 3, fill: CHART_COLORS.primary, stroke: "white", strokeWidth: 2 }}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="bookings"
                            name="Bookings"
                            stroke={CHART_COLORS.blue}
                            strokeWidth={2}
                            dot={{ r: 3, fill: CHART_COLORS.blue, stroke: "white", strokeWidth: 2 }}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="avgTicketPrice"
                            name="Avg. Ticket Price"
                            stroke={CHART_COLORS.green}
                            strokeWidth={2}
                            dot={{ r: 3, fill: CHART_COLORS.green, stroke: "white", strokeWidth: 2 }}
                            strokeDasharray="5 5"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="growthRate"
                            name="Growth Rate (%)"
                            stroke={CHART_COLORS.purple}
                            strokeWidth={2}
                            dot={{ r: 3, fill: CHART_COLORS.purple, stroke: "white", strokeWidth: 2 }}
                            strokeDasharray="3 3"
                        />
                    </LineChart>
                )

            default:
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} />
                        <Line type="monotone" dataKey="bookings" stroke={CHART_COLORS.blue} />
                    </LineChart>
                )
        }
    }

    return (
        <Card className="col-span-1 lg:col-span-5">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>
                            Revenue and booking trends from {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-80 text-red-500">
                        <p>Error loading revenue data: {error}</p>
                    </div>
                ) : (
                    <>
                        <Tabs defaultValue="daily" className="space-y-4" onValueChange={setActiveTab}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                                    <TabsTrigger value="daily">Daily</TabsTrigger>
                                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                </TabsList>

                                <ChartTypeSelector />
                            </div>

                            <TabsContent value="daily" className="space-y-4">
                                <motion.div
                                    key={`daily-${chartType}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="h-[300px] md:h-[400px]"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        {renderChart()}
                                    </ResponsiveContainer>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="weekly" className="space-y-4">
                                <motion.div
                                    key={`weekly-${chartType}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="h-[300px] md:h-[400px]"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        {renderChart()}
                                    </ResponsiveContainer>
                                </motion.div>
                            </TabsContent>

                            <TabsContent value="monthly" className="space-y-4">
                                <motion.div
                                    key={`monthly-${chartType}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                    className="h-[300px] md:h-[400px]"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        {renderChart()}
                                    </ResponsiveContainer>
                                </motion.div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
