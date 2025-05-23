"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { getBookingsDistribution } from "@/lib/services/dashboard"
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, Sector } from "recharts"

interface BookingsDistributionProps {
    isMobile?: boolean
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

export function BookingsDistribution({ isMobile = false }: BookingsDistributionProps) {
    const [data, setData] = useState<any>({
        status: [],
        routes: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("status")
    const [activeIndex, setActiveIndex] = useState(0)

    useEffect(() => {
        const fetchDistributionData = async () => {
            setLoading(true)
            setError(null)

            try {
                const response = await getBookingsDistribution()

                if (response.success && response.data) {
                    // Transform data for each tab
                    const statusData = response.data.status.map((item: any) => ({
                        name: item.label,
                        value: item.count,
                    }))

                    const routeData = response.data.routes.map((item: any) => ({
                        name: item.label,
                        value: item.count,
                    }))

                    setData({
                        status: statusData,
                        routes: routeData,
                    })

                    // If we're using mock data, show a warning
                    if (response.message?.includes("mock data")) {
                        console.warn("Using mock distribution data:", response.message)
                    }
                } else {
                    // Set error message from the API response
                    throw new Error(response.message || "Failed to fetch distribution data")
                }
            } catch (err) {
                console.error("Error fetching distribution data:", err)
                setError(err instanceof Error ? err.message : "An unknown error occurred")

                // Set empty data arrays
                setData({
                    status: [],
                    routes: [],
                })
            } finally {
                setLoading(false)
            }
        }

        fetchDistributionData()
    }, [])

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background p-3 border border-border rounded-md shadow-md">
                    <p className="font-medium">{payload[0].name}</p>
                    <p className="text-sm">
                        Count: <span className="font-medium">{payload[0].value}</span>
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

    // Active shape for interactive pie chart
    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props

        return (
            <g>
                <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#888">
                    {payload.name}
                </text>
                <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#333" fontSize={14} fontWeight="bold">
                    {value} ({(percent * 100).toFixed(1)}%)
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 5}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
            </g>
        )
    }

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index)
    }

    return (
        <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
                <CardTitle>Bookings Distribution</CardTitle>
                <CardDescription>Breakdown of bookings by different categories</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-80 text-center p-6">
                        <div className="text-amber-500 mb-2 text-lg">Data Unavailable</div>
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                ) : (
                    <>
                        <Tabs defaultValue="status" className="space-y-4" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="status">By Status</TabsTrigger>
                                <TabsTrigger value="routes">By Route</TabsTrigger>
                            </TabsList>

                            <TabsContent value="status" className="space-y-4">
                                <div className="h-[300px] md:h-[400px]">
                                    {data.status.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No booking status data available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    activeIndex={activeIndex}
                                                    activeShape={renderActiveShape}
                                                    data={data.status}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? 40 : 60}
                                                    outerRadius={isMobile ? 60 : 80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    onMouseEnter={onPieEnter}
                                                >
                                                    {data.status.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    layout={isMobile ? "horizontal" : "vertical"}
                                                    verticalAlign={isMobile ? "bottom" : "middle"}
                                                    align={isMobile ? "center" : "right"}
                                                    wrapperStyle={isMobile ? { fontSize: 10 } : { fontSize: 12, right: 0 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="routes" className="space-y-4">
                                <div className="h-[300px] md:h-[400px]">
                                    {data.routes.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No route data available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    activeIndex={activeIndex}
                                                    activeShape={renderActiveShape}
                                                    data={data.routes}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={isMobile ? 40 : 60}
                                                    outerRadius={isMobile ? 60 : 80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    onMouseEnter={onPieEnter}
                                                >
                                                    {data.routes.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    layout={isMobile ? "horizontal" : "vertical"}
                                                    verticalAlign={isMobile ? "bottom" : "middle"}
                                                    align={isMobile ? "center" : "right"}
                                                    wrapperStyle={isMobile ? { fontSize: 10 } : { fontSize: 12, right: 0 }}
                                                />
                                            </PieChart>
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
