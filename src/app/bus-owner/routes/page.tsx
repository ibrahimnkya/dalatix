"use client"

import { useState, useEffect } from "react"
import { useTitle } from "@/context/TitleContext"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { TablePagination } from "@/components/table-pagination"
import { TableFilters } from "@/components/table-filters"
import { Route, Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    Card as UICard,
    CardHeader as UICardHeader,
    CardTitle as UICardTitle,
    CardDescription as UICardDescription,
    CardContent as UICardContent,
} from "@/components/ui/card"

interface RouteData {
    id: number
    name: string
    origin: string
    destination: string
    distance: number
    duration: string
    fare: number
    is_active: boolean
    created_at: string
}

interface RoutesResponse {
    data: RouteData[]
    meta?: {
        total: number
        per_page: number
        current_page: number
        last_page: number
    }
}

async function getRoutes(filters: any = {}): Promise<RoutesResponse> {
    const params = new URLSearchParams()

    // Add pagination parameters
    if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
    if (filters.page) params.set("page", String(filters.page))
    if (filters.per_page) params.set("per_page", String(filters.per_page))

    // Add search parameters
    if (filters.name && filters.name.trim()) params.set("name", filters.name.trim())

    // Add status filter
    if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active))

    console.log("Fetching routes with params:", params.toString())

    try {
        const response = await fetch(`/api/proxy/routes?${params}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            cache: "no-store",
        })

        console.log("Routes API response status:", response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Routes API error response:", errorText)

            let errorData
            try {
                errorData = JSON.parse(errorText)
            } catch {
                errorData = { message: errorText || "Failed to fetch routes" }
            }

            throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch routes`)
        }

        const data = await response.json()
        console.log("Raw routes API response:", data)

        // Handle different API response structures
        let routesData: RouteData[] = []
        let meta = null

        if (data.success && data.data) {
            // Handle Laravel pagination response
            if (data.data.data && Array.isArray(data.data.data)) {
                routesData = data.data.data
                meta = {
                    total: data.data.total || data.data.data.length,
                    per_page: data.data.per_page || 10,
                    current_page: data.data.current_page || 1,
                    last_page: data.data.last_page || 1,
                }
            } else if (Array.isArray(data.data)) {
                // Handle direct array response
                routesData = data.data
                meta = {
                    total: data.data.length,
                    per_page: filters.per_page || 10,
                    current_page: filters.page || 1,
                    last_page: Math.ceil(data.data.length / (filters.per_page || 10)),
                }
            }
        } else if (Array.isArray(data)) {
            // Handle direct array response
            routesData = data
            meta = {
                total: data.length,
                per_page: filters.per_page || 10,
                current_page: filters.page || 1,
                last_page: Math.ceil(data.length / (filters.per_page || 10)),
            }
        }

        // Ensure all routes have required fields with fallbacks
        const processedRoutes = routesData.map((route: any) => ({
            id: route.id || 0,
            name: route.name || `Route ${route.id}`,
            origin: route.origin || route.start_point?.name || "Unknown Origin",
            destination: route.destination || route.end_point?.name || "Unknown Destination",
            distance: Number(route.distance) || 0,
            duration: route.duration || route.estimated_journey_hours ? `${route.estimated_journey_hours} hours` : "Unknown",
            fare: Number(route.fare) || 0,
            is_active: Boolean(route.is_active),
            created_at: route.created_at || new Date().toISOString(),
        }))

        console.log("Processed routes:", processedRoutes)
        console.log("Meta data:", meta)

        return {
            data: processedRoutes,
            meta: meta,
        }
    } catch (error) {
        console.error("Error fetching routes:", error)
        throw error
    }
}

export default function BusOwnerRoutesPage() {
    const { setTitle } = useTitle()
    const [routes, setRoutes] = useState<RouteData[]>([])
    const [loading, setLoading] = useState(true)
    const [totalItems, setTotalItems] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)
    const [totalRoutes, setTotalRoutes] = useState(0)
    const [activeRoutes, setActiveRoutes] = useState(0)
    const [inactiveRoutes, setInactiveRoutes] = useState(0)
    const [totalDistance, setTotalDistance] = useState(0)

    useEffect(() => {
        setTitle("Routes")
    }, [setTitle])

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                setLoading(true)
                const response = await getRoutes({
                    page: currentPage,
                    per_page: itemsPerPage,
                    name: searchTerm,
                    is_active: filterStatus === "active" ? true : filterStatus === "inactive" ? false : undefined,
                    paginate: true,
                })

                if (Array.isArray(response.data)) {
                    setRoutes(response.data)
                    setTotalItems(response.meta?.total || response.data.length)

                    // For statistics, we need to fetch all routes without pagination
                    try {
                        const allRoutesResponse = await getRoutes({
                            paginate: false,
                        })

                        const allRoutes = Array.isArray(allRoutesResponse.data) ? allRoutesResponse.data : []
                        setTotalRoutes(allRoutes.length)

                        // Calculate active and inactive routes from all routes
                        const active = allRoutes.filter((route) => route.is_active).length
                        const inactive = allRoutes.filter((route) => !route.is_active).length
                        setActiveRoutes(active)
                        setInactiveRoutes(inactive)

                        // Calculate total distance from all routes
                        const distance = allRoutes.reduce((acc, route) => acc + (Number(route.distance) || 0), 0)
                        setTotalDistance(distance)
                    } catch (statsError) {
                        console.error("Error fetching route statistics:", statsError)
                        // Use current page data for stats if all routes fetch fails
                        setTotalRoutes(response.data.length)
                        const active = response.data.filter((route) => route.is_active).length
                        const inactive = response.data.filter((route) => !route.is_active).length
                        setActiveRoutes(active)
                        setInactiveRoutes(inactive)
                        const distance = response.data.reduce((acc, route) => acc + (Number(route.distance) || 0), 0)
                        setTotalDistance(distance)
                    }
                } else {
                    console.error("Expected routes.data to be an array but got:", response.data)
                    setRoutes([])
                    setTotalItems(0)
                    setTotalRoutes(0)
                    setActiveRoutes(0)
                    setInactiveRoutes(0)
                    setTotalDistance(0)
                }
            } catch (error) {
                console.error("Failed to fetch routes:", error)
                setRoutes([])
                setTotalItems(0)
                setTotalRoutes(0)
                setActiveRoutes(0)
                setInactiveRoutes(0)
                setTotalDistance(0)
            } finally {
                setLoading(false)
            }
        }

        fetchRoutes()
    }, [currentPage, itemsPerPage, searchTerm, filterStatus])

    const statusOptions = [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Routes"
                subtitle="View all available routes in the system"
                icon={<Route className="h-6 w-6" />}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <UICard>
                    <UICardHeader>
                        <UICardTitle>Total Routes</UICardTitle>
                        <UICardDescription>Total number of routes in the system</UICardDescription>
                    </UICardHeader>
                    <UICardContent className="text-2xl font-bold">{totalRoutes}</UICardContent>
                </UICard>

                <UICard>
                    <UICardHeader>
                        <UICardTitle>Active Routes</UICardTitle>
                        <UICardDescription>Number of active routes</UICardDescription>
                    </UICardHeader>
                    <UICardContent className="text-2xl font-bold">{activeRoutes}</UICardContent>
                </UICard>

                <UICard>
                    <UICardHeader>
                        <UICardTitle>Inactive Routes</UICardTitle>
                        <UICardDescription>Number of inactive routes</UICardDescription>
                    </UICardHeader>
                    <UICardContent className="text-2xl font-bold">{inactiveRoutes}</UICardContent>
                </UICard>

                <UICard>
                    <UICardHeader>
                        <UICardTitle>Total Distance</UICardTitle>
                        <UICardDescription>Total distance of all routes</UICardDescription>
                    </UICardHeader>
                    <UICardContent className="text-2xl font-bold">{totalDistance.toFixed(2)} km</UICardContent>
                </UICard>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Routes List</CardTitle>
                    <TableFilters
                        searchPlaceholder="Search by route name..."
                        onSearchChange={setSearchTerm}
                        filterOptions={statusOptions}
                        filterValue={filterStatus}
                        onFilterChange={setFilterStatus}
                        filterLabel="Status"
                    />
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
                                            <TableHead>Route Name</TableHead>
                                            <TableHead>Origin</TableHead>
                                            <TableHead>Destination</TableHead>
                                            <TableHead>Distance</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Fare</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {routes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                    No routes found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            routes.map((route) => (
                                                <TableRow key={route.id}>
                                                    <TableCell className="font-medium">{route.name}</TableCell>
                                                    <TableCell>{route.origin}</TableCell>
                                                    <TableCell>{route.destination}</TableCell>
                                                    <TableCell>{route.distance} km</TableCell>
                                                    <TableCell>{route.duration}</TableCell>
                                                    <TableCell>TZS {route.fare.toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={route.is_active ? "success" : "destructive"} className="capitalize">
                                                            {route.is_active ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDate(route.created_at)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={() => setSelectedRoute(route)}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="sm:max-w-[625px]">
                                                                <DialogHeader>
                                                                    <DialogTitle>{selectedRoute?.name}</DialogTitle>
                                                                    <DialogDescription>View detailed information about this route.</DialogDescription>
                                                                </DialogHeader>
                                                                <div className="grid gap-4 py-4">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <h3 className="text-lg font-semibold">Route Information</h3>
                                                                            <Separator />
                                                                            <div className="grid gap-2">
                                                                                <div>
                                                                                    <span className="font-semibold">Origin:</span> {selectedRoute?.origin}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Destination:</span>{" "}
                                                                                    {selectedRoute?.destination}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Distance:</span> {selectedRoute?.distance} km
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Duration:</span> {selectedRoute?.duration}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Fare:</span> TZS{" "}
                                                                                    {selectedRoute?.fare?.toLocaleString()}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Status:</span>
                                                                                    <Badge
                                                                                        variant={selectedRoute?.is_active ? "success" : "destructive"}
                                                                                        className="capitalize"
                                                                                    >
                                                                                        {selectedRoute?.is_active ? "Active" : "Inactive"}
                                                                                    </Badge>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-semibold">Created Date:</span>{" "}
                                                                                    {formatDate(selectedRoute?.created_at)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-lg font-semibold">Route Map</h3>
                                                                            <Separator />
                                                                            <div className="h-[200px] w-full relative rounded-md overflow-hidden border bg-muted/20 flex items-center justify-center">
                                                                                <div className="text-center">
                                                                                    <Route className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                                                                    <p className="text-muted-foreground">Route Map</p>
                                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                                        {selectedRoute?.origin} → {selectedRoute?.destination}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
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
        </div>
    )
}
