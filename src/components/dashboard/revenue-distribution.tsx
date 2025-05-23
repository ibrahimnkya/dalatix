"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, PieChartIcon, BarChartIcon } from "lucide-react"
import { getRevenueDistribution } from "@/lib/services/dashboard"
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
import { CHART_COLORS } from "@/constants/theme"

interface RevenueDistributionProps {
    isMobile?: boolean
    startDate?: string
    endDate?: string
    companyId?: string
    className?: string
}

export function RevenueDistribution({
                                        isMobile = false,
                                        startDate,
                                        endDate,
                                        companyId,
                                        className,
                                    }: RevenueDistributionProps) {
    const [data, setData] = useState<any>({
        revenue: [],
        vehicles: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("revenue")
    const [activeIndex, setActiveIndex] = useState(0)
    const [chartType, setChartType] = useState<"doughnut" | "bar">("doughnut")

    // Define chart colors from theme
    const COLORS = [
        CHART_COLORS.primary,
        CHART_COLORS.blue,
        CHART_COLORS.green,
        CHART_COLORS.orange,
        CHART_COLORS.purple,
        CHART_COLORS.teal,
    ]

    useEffect(() => {
        const fetchDistributionData = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await getRevenueDistribution(startDate, endDate, companyId)

                if (response.success && response.data) {
                    // Transform data for each tab
                    const revenueData = response.data.revenue.map((item: any) => ({
                        name: item.label,
                        value: item.count,
                    }))

                    const vehicleData = response.data.vehicles.map((item: any) => ({
                        name: item.label,
                        value: item.count,
                    }))

                    setData({
                        revenue: revenueData,
                        vehicles: vehicleData,
                    })
                } else {
                    throw new Error(response.message || "Failed to fetch revenue distribution data")
                }
            } catch (err) {
                console.error("Error fetching revenue distribution data:", err)
                setError(err instanceof Error ? err.message : "An unknown error occurred")

                // Set empty data arrays
                setData({
                    revenue: [],
                    vehicles: [],
                })
            } finally {
                setLoading(false)
            }
        }

        fetchDistributionData()
    }, [startDate, endDate, companyId])

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-3 border border-border rounded-md shadow-md">
                    <p className="font-medium">{payload[0].name}</p>
                    <p className="text-sm">
                        {activeTab === "revenue" ? "Revenue: TZS " : "Count: "}
                        <span className="font-medium">
              {activeTab === "revenue" ? Number(payload[0].value).toLocaleString() : payload[0].value}
            </span>
                    </p>
                    <p className="text-sm">
                        Percentage: <span className="font-medium">{((payload[0].value / getTotalValue()) * 100).toFixed(1)}%</span>
                    </p>
                </div>
            )
        }
        return null
    }

    const getTotalValue = () => {
        if (!data || !data[activeTab]) return 0
        return data[activeTab].reduce((sum: number, entry: any) => sum + entry.value, 0)
    }

    // Active shape for interactive doughnut chart
    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props

        return (
            <g>
                <text x={cx} y={cy - 5} textAnchor="middle" fill="#888" fontSize={12}>
                    {payload.name}
                </text>
                <text x={cx} y={cy + 20} textAnchor="middle" fill="#333" fontSize={16} fontWeight="bold">
                    {activeTab === "revenue" ? "TZS " : ""}
                    {Number(value).toLocaleString()}
                </text>
                <text x={cx} y={cy + 40} textAnchor="middle" fill="#666" fontSize={14}>
                    {(percent * 100).toFixed(1)}%
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 10}
                    outerRadius={outerRadius + 12}
                    fill={fill}
                />
            </g>
        )
    }

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index)
    }

    const toggleChartType = () => {
        setChartType(chartType === "doughnut" ? "bar" : "doughnut")
    }

    return (
        <Card className={className || "col-span-1 lg:col-span-2"}>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Revenue & Vehicle Distribution</CardTitle>
                        <CardDescription>Breakdown of revenue and vehicle statistics</CardDescription>
                    </div>
                    <button
                        onClick={toggleChartType}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                        {chartType === "doughnut" ? (
                            <>
                                <BarChartIcon className="h-3.5 w-3.5 mr-1" />
                                Bar Chart
                            </>
                        ) : (
                            <>
                                <PieChartIcon className="h-3.5 w-3.5 mr-1" />
                                Doughnut Chart
                            </>
                        )}
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-80 text-center p-6">
                        <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                        <div className="text-amber-500 mb-2 text-lg">Data Unavailable</div>
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                ) : (
                    <>
                        <Tabs defaultValue="revenue" className="space-y-4" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                            </TabsList>

                            <TabsContent value="revenue" className="space-y-4">
                                <div className="h-[300px] md:h-[400px]">
                                    {data.revenue.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No revenue distribution data available
                                        </div>
                                    ) : chartType === "doughnut" ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <defs>
                                                    {COLORS.map((color, index) => (
                                                        <linearGradient
                                                            key={`gradient-${index}`}
                                                            id={`colorGradient${index}`}
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
                                                <Pie
                                                    activeIndex={activeIndex}
                                                    activeShape={renderActiveShape}
                                                    data={data.revenue}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? 60 : 80}
                                                    outerRadius={isMobile ? 80 : 110}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    onMouseEnter={onPieEnter}
                                                    paddingAngle={2}
                                                >
                                                    {data.revenue.map((entry: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={`url(#colorGradient${index % COLORS.length})`}
                                                            stroke={COLORS[index % COLORS.length]}
                                                            strokeWidth={1}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    layout={isMobile ? "horizontal" : "vertical"}
                                                    verticalAlign={isMobile ? "bottom" : "middle"}
                                                    align={isMobile ? "center" : "right"}
                                                    wrapperStyle={isMobile ? { fontSize: 10, bottom: 0 } : { fontSize: 12, right: 0 }}
                                                    iconType="circle"
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={data.revenue}
                                                margin={{
                                                    top: 20,
                                                    right: 30,
                                                    left: isMobile ? 20 : 40,
                                                    bottom: isMobile ? 60 : 40,
                                                }}
                                                barSize={isMobile ? 20 : 30}
                                            >
                                                <defs>
                                                    {COLORS.map((color, index) => (
                                                        <linearGradient
                                                            key={`gradient-${index}`}
                                                            id={`barGradient${index}`}
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
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={isMobile ? -45 : 0}
                                                    textAnchor={isMobile ? "end" : "middle"}
                                                    height={isMobile ? 80 : 60}
                                                    tick={{ fontSize: isMobile ? 10 : 12 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: "#E5E7EB" }}
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                                    width={isMobile ? 40 : 60}
                                                    tick={{ fontSize: isMobile ? 10 : 12 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: "#E5E7EB" }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                                                <Bar dataKey="value" name="Revenue (TZS)" radius={[4, 4, 0, 0]}>
                                                    {data.revenue.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={`url(#barGradient${index % COLORS.length})`} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="vehicles" className="space-y-4">
                                <div className="h-[300px] md:h-[400px]">
                                    {data.vehicles.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No vehicle distribution data available
                                        </div>
                                    ) : chartType === "doughnut" ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <defs>
                                                    {COLORS.map((color, index) => (
                                                        <linearGradient
                                                            key={`gradient-${index}`}
                                                            id={`vehicleGradient${index}`}
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
                                                <Pie
                                                    activeIndex={activeIndex}
                                                    activeShape={renderActiveShape}
                                                    data={data.vehicles}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? 60 : 80}
                                                    outerRadius={isMobile ? 80 : 110}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    onMouseEnter={onPieEnter}
                                                    paddingAngle={2}
                                                >
                                                    {data.vehicles.map((entry: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={`url(#vehicleGradient${index % COLORS.length})`}
                                                            stroke={COLORS[index % COLORS.length]}
                                                            strokeWidth={1}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    layout={isMobile ? "horizontal" : "vertical"}
                                                    verticalAlign={isMobile ? "bottom" : "middle"}
                                                    align={isMobile ? "center" : "right"}
                                                    wrapperStyle={isMobile ? { fontSize: 10, bottom: 0 } : { fontSize: 12, right: 0 }}
                                                    iconType="circle"
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={data.vehicles}
                                                margin={{
                                                    top: 20,
                                                    right: 30,
                                                    left: isMobile ? 20 : 40,
                                                    bottom: isMobile ? 60 : 40,
                                                }}
                                                barSize={isMobile ? 20 : 30}
                                            >
                                                <defs>
                                                    {COLORS.map((color, index) => (
                                                        <linearGradient
                                                            key={`gradient-${index}`}
                                                            id={`vehicleBarGradient${index}`}
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
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={isMobile ? -45 : 0}
                                                    textAnchor={isMobile ? "end" : "middle"}
                                                    height={isMobile ? 80 : 60}
                                                    tick={{ fontSize: isMobile ? 10 : 12 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: "#E5E7EB" }}
                                                />
                                                <YAxis
                                                    width={isMobile ? 40 : 60}
                                                    tick={{ fontSize: isMobile ? 10 : 12 }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: "#E5E7EB" }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} iconType="circle" />
                                                <Bar dataKey="value" name="Vehicles" radius={[4, 4, 0, 0]}>
                                                    {data.vehicles.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={`url(#vehicleBarGradient${index % COLORS.length})`} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
