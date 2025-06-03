"use client"

import { useState, useEffect } from "react"
import { useTitle } from "@/context/TitleContext"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/loading-spinner"
import { TablePagination } from "@/components/table-pagination"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { MapPin, Search, Eye, RefreshCw, MapIcon } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface BusStop {
    id: number
    name: string
    code: string
    location: string
    latitude?: number
    longitude?: number
    is_active: boolean
    created_at: string
    updated_at?: string
}

// Coordinate format utilities
// Convert from decimal degrees to DMS
const decimalToDMS = (decimal: number, isLatitude: boolean): string => {
    const absDecimal = Math.abs(decimal)
    const degrees = Math.floor(absDecimal)
    const minutes = Math.floor((absDecimal - degrees) * 60)
    const seconds = ((absDecimal - degrees - minutes / 60) * 3600).toFixed(2)

    const direction = isLatitude ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W"

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`
}

// Helper function to safely format coordinates
const formatCoordinate = (value: any): string => {
    if (value === null || value === undefined) return "N/A"
    return Number(value).toFixed(6)
}

async function getBusStops(filters: any = {}) {
    const params = new URLSearchParams()

    // Only add parameters that are actually needed
    if (filters.name) params.set("name", filters.name)
    if (filters.code) params.set("code", filters.code)
    if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active))
    if (filters.page) params.set("page", String(filters.page))
    if (filters.per_page) params.set("per_page", String(filters.per_page))

    // Always set paginate to true for proper pagination
    params.set("paginate", "true")

    try {
        console.log("Fetching bus stops with params:", params.toString())

        // Fixed: Use bus_stops (with underscore) instead of bus-stops (with hyphen)
        const response = await fetch(`/api/proxy/bus_stops?${params}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            cache: "no-store",
        })

        console.log("Bus stops API response status:", response.status)

        if (!response.ok) {
            let errorMessage = "Failed to fetch bus stops"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorData.error || errorMessage
                console.error("API Error Response:", errorData)
            } catch (parseError) {
                console.error("Failed to parse error response:", parseError)
                errorMessage = `HTTP ${response.status}: ${response.statusText}`
            }
            throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log("Bus stops API response data:", data)
        return data
    } catch (error) {
        console.error("Error fetching bus stops:", error)
        throw error
    }
}

export default function BusOwnerBusStopsPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const isMobile = useMobile()

    const [busStops, setBusStops] = useState<BusStop[]>([])
    const [loading, setLoading] = useState(true)
    const [totalItems, setTotalItems] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState("")

    // View dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedBusStop, setSelectedBusStop] = useState<BusStop | null>(null)

    useEffect(() => {
        setTitle("Bus Stops")
    }, [setTitle])

    useEffect(() => {
        const fetchBusStops = async () => {
            try {
                setLoading(true)
                console.log("Starting to fetch bus stops...")

                const response = await getBusStops({
                    page: currentPage,
                    per_page: itemsPerPage,
                    name: searchTerm || undefined,
                })

                console.log("Raw bus stops response:", response)

                let busStopsData = []
                let total = 0

                // Handle different API response structures
                if (response.success && response.data) {
                    if (Array.isArray(response.data.data)) {
                        // Laravel pagination format: { success: true, data: { data: [...], total: 123 } }
                        busStopsData = response.data.data
                        total = response.data.total || response.data.data.length
                    } else if (Array.isArray(response.data)) {
                        // Direct array in data: { success: true, data: [...] }
                        busStopsData = response.data
                        total = response.meta?.total || response.data.length
                    }
                } else if (response.data) {
                    if (Array.isArray(response.data.data)) {
                        // Nested data structure: { data: { data: [...], total: 123 } }
                        busStopsData = response.data.data
                        total = response.data.total || response.data.data.length
                    } else if (Array.isArray(response.data)) {
                        // Direct array in data property: { data: [...] }
                        busStopsData = response.data
                        total = response.meta?.total || response.data.length
                    }
                } else if (Array.isArray(response)) {
                    // Direct array response: [...]
                    busStopsData = response
                    total = response.length
                } else {
                    console.error("Unexpected API response format:", response)
                    busStopsData = []
                    total = 0
                }

                console.log("Processed bus stops data:", busStopsData)
                console.log("Total items:", total)

                setBusStops(busStopsData)
                setTotalItems(total)
            } catch (error) {
                console.error("Failed to fetch bus stops:", error)
                toast({
                    title: "Error",
                    description: `Failed to load bus stops: ${error.message}`,
                    variant: "destructive",
                })
                setBusStops([])
                setTotalItems(0)
            } finally {
                setLoading(false)
            }
        }

        fetchBusStops()
    }, [currentPage, itemsPerPage, searchTerm, toast])

    // const statusOptions = [
    //     { label: "All Statuses", value: null },
    //     { label: "Active", value: "active" },
    //     { label: "Inactive", value: "inactive" },
    // ]

    // Calculate stats
    const stats = {
        total: Array.isArray(busStops) ? totalItems : 0,
        withCoordinates: Array.isArray(busStops)
            ? busStops.filter((stop) => stop && stop.latitude && stop.longitude).length
            : 0,
    }

    // Filter bus stops based on search query for client-side filtering
    const filteredBusStops = Array.isArray(busStops)
        ? busStops.filter((busStop) => {
            if (!busStop) return false
            if (!searchTerm) return true

            const name = (busStop.name || "").toLowerCase()
            const code = (busStop.code || "").toLowerCase()
            const location = (busStop.location || "").toLowerCase()
            const query = searchTerm.toLowerCase()

            return name.includes(query) || code.includes(query) || location.includes(query)
        })
        : []

    const handleViewBusStop = (busStop: BusStop) => {
        setSelectedBusStop(busStop)
        setIsViewDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bus Stops"
                subtitle="View all available bus stops in the system"
                icon={<MapPin className="h-6 w-6" />}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bus Stops</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All bus stops</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">With Coordinates</CardTitle>
                        <MapPin className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.withCoordinates}</div>
                        <p className="text-xs text-muted-foreground">Mappable bus stops</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Bus Stops List</CardTitle>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search bus stops..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Code</TableHead>
                                            {!isMobile && <TableHead>Location</TableHead>}
                                            {!isMobile && <TableHead>Coordinates</TableHead>}
                                            {/*<TableHead>Status</TableHead>*/}
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBusStops.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={isMobile ? 4 : 6} className="text-center py-8 text-muted-foreground">
                                                    No bus stops found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBusStops.map((busStop) => (
                                                <TableRow key={busStop.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center">
                                                            <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                                                            {busStop.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono">{busStop.code}</TableCell>
                                                    {!isMobile && <TableCell>{busStop.location || "N/A"}</TableCell>}
                                                    {!isMobile && (
                                                        <TableCell className="font-mono text-xs">
                                                            {busStop.latitude && busStop.longitude
                                                                ? `${formatCoordinate(busStop.latitude)}, ${formatCoordinate(busStop.longitude)}`
                                                                : "Not available"}
                                                        </TableCell>
                                                    )}

                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleViewBusStop(busStop)}
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <TablePagination
                                currentPage={currentPage}
                                totalItems={totalItems}
                                pageSize={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setItemsPerPage}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* View Bus Stop Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Bus Stop Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected bus stop.</DialogDescription>
                    </DialogHeader>
                    {selectedBusStop ? (
                        <div className="py-4">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-medium">{selectedBusStop.name}</h3>
                                <div className="text-sm text-muted-foreground">
                                    Code: <span className="font-mono">{selectedBusStop.code}</span>
                                </div>
                            </div>

                            <Tabs defaultValue="details">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="map">Map View</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">ID</h4>
                                            <p className="text-sm">{selectedBusStop.id}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Code</h4>
                                            <p className="text-sm font-mono">{selectedBusStop.code}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Latitude</h4>
                                            <p className="text-sm font-mono">{formatCoordinate(selectedBusStop.latitude)}</p>
                                            {selectedBusStop.latitude && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {decimalToDMS(Number(selectedBusStop.latitude), true)}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Longitude</h4>
                                            <p className="text-sm font-mono">{formatCoordinate(selectedBusStop.longitude)}</p>
                                            {selectedBusStop.longitude && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {decimalToDMS(Number(selectedBusStop.longitude), false)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <h4 className="text-sm font-medium mb-1">Location</h4>
                                        <p className="text-sm">{selectedBusStop.location || "Not specified"}</p>
                                    </div>



                                    {selectedBusStop.created_at && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Created At</h4>
                                            <p className="text-sm">{formatDate(selectedBusStop.created_at)}</p>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="map" className="h-[300px] mt-4">
                                    {selectedBusStop.latitude && selectedBusStop.longitude ? (
                                        <div className="h-full w-full relative rounded-md overflow-hidden border">
                                            <iframe
                                                title={`Map for ${selectedBusStop.name}`}
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                scrolling="no"
                                                marginHeight={0}
                                                marginWidth={0}
                                                src={`https://maps.google.com/maps?q=${selectedBusStop.latitude},${selectedBusStop.longitude}&z=15&output=embed`}
                                            ></iframe>
                                            <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded-md text-xs shadow-md">
                                                <div>
                                                    {formatCoordinate(selectedBusStop.latitude)}, {formatCoordinate(selectedBusStop.longitude)}
                                                </div>
                                                <div className="mt-1 text-muted-foreground">
                                                    {decimalToDMS(Number(selectedBusStop.latitude), true)},{" "}
                                                    {decimalToDMS(Number(selectedBusStop.longitude), false)}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                                            <div className="text-center">
                                                <MapIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-muted-foreground">No coordinates available for this bus stop</p>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-muted-foreground">No bus stop data available</div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
