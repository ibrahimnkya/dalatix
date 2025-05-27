"use client"

import type React from "react"

import type { Route, CreateRouteData, UpdateRouteData } from "@/types/route"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getRoutes, getRoute, createRoute, updateRoute, deleteRoute } from "@/lib/services/route"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    Plus,
    Search,
    Download,
    Edit,
    Trash2,
    Eye,
    Map,
    Check,
    X,
    ChevronDown,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Import the bus stops service
import { getBusStops } from "@/lib/services/bus-stop"

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return Number(distance.toFixed(2))
}

// Function to estimate journey time based on distance
const estimateJourneyTime = (distanceKm: number): number => {
    const avgSpeedKmh = 40 // Average speed in km/h (adjust as needed)
    const timeHours = distanceKm / avgSpeedKmh
    return Number(timeHours.toFixed(2))
}

export default function RoutesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // State for search, filters, and pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(10)

    // State for dialogs
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
    const [viewingRoute, setViewingRoute] = useState<Route | null>(null)

    // Form state
    const [formData, setFormData] = useState<CreateRouteData>({
        name: "",
        start_point_id: 1,
        end_point_id: 4,
        distance: 15.5,
        estimated_journey_hours: 0.75,
        fare: 500,
        is_active: true,
    })

    // Add state for selected bus stops with coordinates
    const [selectedStartPoint, setSelectedStartPoint] = useState<any>(null)
    const [selectedEndPoint, setSelectedEndPoint] = useState<any>(null)

    // Form validation errors
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Fetch routes with React Query
    const {
        data: routesData,
        isLoading: isLoadingRoutes,
        isError: isErrorRoutes,
        refetch: refetchRoutes,
    } = useQuery({
        queryKey: ["routes", currentPage, pageSize, statusFilter],
        queryFn: async () => {
            const response = await getRoutes({
                paginate: true,
                page: currentPage,
                is_active: statusFilter.length === 1 ? statusFilter[0] === "active" : undefined,
            })
            console.log("API Response:", response) // Debug log
            return response
        },
    })

    // Fetch single route details
    const {
        data: routeDetails,
        isLoading: isLoadingRouteDetails,
        isError: isErrorRouteDetails,
        refetch: refetchRouteDetails,
    } = useQuery({
        queryKey: ["route", viewingRoute?.id],
        queryFn: () => (viewingRoute?.id ? getRoute(viewingRoute.id) : null),
        enabled: !!viewingRoute?.id,
    })

    // Fetch ALL bus stops for dropdowns (without pagination)
    const {
        data: busStopsData,
        isLoading: isLoadingBusStops,
        isError: isErrorBusStops,
    } = useQuery({
        queryKey: ["allBusStops"],
        queryFn: async () => {
            const response = await getBusStops({
                paginate: false, // Remove pagination to get all bus stops
            })
            return response
        },
    })

    // Extract bus stops array from the response
    const busStops = Array.isArray(busStopsData?.data)
        ? busStopsData.data
        : busStopsData?.data?.data && Array.isArray(busStopsData.data.data)
            ? busStopsData.data.data
            : []

    // Create route mutation
    const createRouteMutation = useMutation({
        mutationFn: (data: CreateRouteData) => createRoute(data),
        onSuccess: () => {
            // Invalidate and refetch routes query to update the UI
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            refetchRoutes()

            toast({
                title: "Route created",
                description: "The route has been created successfully.",
            })
            setIsAddEditDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to create route: ${error.message}`,
                variant: "destructive",
            })
        },
    })

    // Update route mutation
    const updateRouteMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateRouteData }) => updateRoute(id, data),
        onSuccess: () => {
            // Invalidate and refetch routes query to update the UI
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            refetchRoutes()

            toast({
                title: "Route updated",
                description: "The route has been updated successfully.",
            })
            setIsAddEditDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to update route: ${error.message}`,
                variant: "destructive",
            })
        },
    })

    // Delete route mutation
    const deleteRouteMutation = useMutation({
        mutationFn: (id: number) => deleteRoute(id),
        onSuccess: () => {
            // Invalidate and refetch routes query to update the UI
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            refetchRoutes()

            toast({
                title: "Route deleted",
                description: "The route has been deleted successfully.",
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: `Failed to delete route: ${error.message}`,
                variant: "destructive",
            })
        },
    })

    // Extract routes and pagination data
    const routes = Array.isArray(routesData?.data)
        ? routesData.data
        : routesData?.data?.data && Array.isArray(routesData.data.data)
            ? routesData.data.data
            : []
    const pagination = {
        currentPage: routesData?.meta?.current_page || 1,
        totalPages: routesData?.meta?.last_page || 1,
        totalItems: routesData?.meta?.total || 0,
        perPage: routesData?.meta?.per_page || 10,
    }

    // Calculate total distance with proper error handling
    const calculateTotalDistance = () => {
        if (!Array.isArray(routes) || routes.length === 0) {
            return 0
        }

        return routes.reduce((sum, route) => {
            // Ensure route exists and has a distance property that's a number
            if (!route) return sum

            // Convert distance to a number if it's not already
            const distance =
                typeof route.distance === "number"
                    ? route.distance
                    : typeof route.distance === "string"
                        ? Number.parseFloat(route.distance)
                        : 0

            // Only add valid numbers
            return !isNaN(distance) ? sum + distance : sum
        }, 0)
    }

    // Calculate stats
    const stats = {
        total: Array.isArray(routes) ? routes.length : 0,
        active: Array.isArray(routes) ? routes.filter((route) => route && route.is_active).length : 0,
        inactive: Array.isArray(routes) ? routes.filter((route) => route && !route.is_active).length : 0,
        totalDistance: calculateTotalDistance(),
    }

    // Filter routes based on search query
    const filteredRoutes = Array.isArray(routes)
        ? routes.filter((route: Route) => {
            if (!route) return false

            // Filter by search query
            const name = (route.name || "").toLowerCase()
            const query = searchQuery.toLowerCase()
            const matchesSearch = name.includes(query)

            // Filter by status
            const matchesStatus =
                statusFilter.length === 0 ||
                (statusFilter.includes("active") && route.is_active) ||
                (statusFilter.includes("inactive") && !route.is_active)

            return matchesSearch && matchesStatus
        })
        : []

    // Validate form data
    const validateForm = () => {
        const errors: Record<string, string> = {}

        if (!formData.name.trim()) {
            errors.name = "Route name is required"
        }

        if (!formData.start_point_id) {
            errors.start_point_id = "Start point is required"
        }

        if (!formData.end_point_id) {
            errors.end_point_id = "End point is required"
        }

        if (formData.start_point_id === formData.end_point_id) {
            errors.end_point_id = "End point must be different from start point"
        }

        if (!formData.distance || formData.distance <= 0) {
            errors.distance = "Distance must be greater than 0"
        }

        if (!formData.estimated_journey_hours || formData.estimated_journey_hours <= 0) {
            errors.estimated_journey_hours = "Journey time must be greater than 0"
        }

        if (!formData.fare || formData.fare < 0) {
            errors.fare = "Fare must be a positive number"
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Handle opening the add/edit dialog
    const handleAddEdit = (route?: Route) => {
        // Reset form errors
        setFormErrors({})

        if (route) {
            setSelectedRoute(route)
            setFormData({
                name: route.name || "",
                start_point_id: route.start_point_id || 1,
                end_point_id: route.end_point_id || 4,
                distance: route.distance || 15.5,
                estimated_journey_hours: route.estimated_journey_hours || 0.75,
                fare: route.fare || 500,
                is_active: route.is_active !== undefined ? route.is_active : true,
            })

            // Find and set the selected bus stops
            const startPoint = busStops.find((stop) => stop.id === route.start_point_id)
            const endPoint = busStops.find((stop) => stop.id === route.end_point_id)
            setSelectedStartPoint(startPoint || null)
            setSelectedEndPoint(endPoint || null)
        } else {
            setSelectedRoute(null)
            setFormData({
                name: "",
                start_point_id: 1,
                end_point_id: 4,
                distance: 15.5,
                estimated_journey_hours: 0.75,
                fare: 500,
                is_active: true,
            })
            setSelectedStartPoint(null)
            setSelectedEndPoint(null)
        }
        setIsAddEditDialogOpen(true)
    }

    // Handle opening the view dialog
    const handleViewRoute = (route: Route) => {
        setViewingRoute(route)
        setIsViewDialogOpen(true)
    }

    // Handle opening the delete dialog
    const handleDeleteDialog = (route: Route) => {
        setSelectedRoute(route)
        setIsDeleteDialogOpen(true)
    }

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target

        // Clear the error for this field when user starts typing
        if (formErrors[id]) {
            setFormErrors({ ...formErrors, [id]: "" })
        }

        setFormData({
            ...formData,
            [id]: type === "number" ? Number.parseFloat(value) : value,
        })
    }

    const handleSelectChange = (id: string, value: string) => {
        // Clear the error for this field when user makes a selection
        if (formErrors[id]) {
            setFormErrors({ ...formErrors, [id]: "" })
        }

        if (id === "is_active") {
            setFormData({ ...formData, [id]: value === "true" })
        } else if (id === "start_point_id" || id === "end_point_id") {
            const pointId = Number.parseInt(value)
            setFormData({ ...formData, [id]: pointId })

            // Find the bus stop and update the selected point
            const busStop = busStops.find((stop) => stop.id === pointId)
            if (busStop) {
                if (id === "start_point_id") {
                    setSelectedStartPoint(busStop)
                } else {
                    setSelectedEndPoint(busStop)
                }
            }
        } else {
            setFormData({ ...formData, [id]: value })
        }
    }

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validate form before submission
        if (!validateForm()) {
            return
        }

        // Prepare data for API
        const apiData: CreateRouteData = {
            name: formData.name,
            start_point_id: formData.start_point_id,
            end_point_id: formData.end_point_id,
            distance: formData.distance,
            estimated_journey_hours: formData.estimated_journey_hours,
            fare: formData.fare,
            is_active: formData.is_active,
        }

        if (selectedRoute && selectedRoute.id) {
            updateRouteMutation.mutate({ id: selectedRoute.id, data: apiData })
        } else {
            createRouteMutation.mutate(apiData)
        }
    }

    // Handle delete confirmation
    const handleDeleteConfirm = () => {
        if (selectedRoute && selectedRoute.id) {
            deleteRouteMutation.mutate(selectedRoute.id)
        }
    }

    // Get bus stop name by ID
    const getBusStopName = (id: number) => {
        if (!Array.isArray(busStops) || busStops.length === 0) {
            return `Bus Stop ${id}`
        }
        const busStop = busStops.find((stop) => stop.id === id)
        return busStop ? busStop.name : `Bus Stop ${id}`
    }

    // Toggle status filter
    const toggleStatusFilter = (status: string) => {
        setStatusFilter((current) => {
            if (current.includes(status)) {
                return current.filter((s) => s !== status)
            } else {
                return [...current, status]
            }
        })
    }

    // Auto-calculate distance and time when start and end points are selected
    const calculateDistanceAndTime = () => {
        if (selectedStartPoint && selectedEndPoint) {
            const distance = calculateDistance(
                selectedStartPoint.latitude,
                selectedStartPoint.longitude,
                selectedEndPoint.latitude,
                selectedEndPoint.longitude,
            )
            const journeyTime = estimateJourneyTime(distance)

            setFormData((prev) => ({
                ...prev,
                distance: distance,
                estimated_journey_hours: journeyTime,
            }))
        }
    }

    useEffect(() => {
        calculateDistanceAndTime()
    }, [selectedStartPoint, selectedEndPoint])

    // Loading state
    if (isLoadingRoutes) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    // Error state
    if (isErrorRoutes) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Error loading routes. Please try again.</span>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchRoutes()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Routes Management"
                description="Manage all transportation routes in the system"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchRoutes()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Route
                        </Button>
                    </div>
                }
                className="mb-6"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                        <Map className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All routes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                        <Map className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Routes</CardTitle>
                        <Map className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inactive}</div>
                        <p className="text-xs text-muted-foreground">Not in service</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                        <Map className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDistance.toFixed(1)} km</div>
                        <p className="text-xs text-muted-foreground">Combined route length</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search routes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <ChevronDown className="mr-2 h-4 w-4" />
                                Status:{" "}
                                {statusFilter.length === 0
                                    ? "All"
                                    : statusFilter.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuCheckboxItem
                                checked={statusFilter.includes("active")}
                                onCheckedChange={() => toggleStatusFilter("active")}
                            >
                                Active
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={statusFilter.includes("inactive")}
                                onCheckedChange={() => toggleStatusFilter("inactive")}
                            >
                                Inactive
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Start Point</TableHead>
                            <TableHead>End Point</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead>Est. Time</TableHead>
                            <TableHead>Fare</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRoutes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No routes found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRoutes.map((route: Route) => (
                                <TableRow key={route.id}>
                                    <TableCell className="font-medium">{route.name}</TableCell>
                                    <TableCell>{getBusStopName(route.start_point_id)}</TableCell>
                                    <TableCell>{getBusStopName(route.end_point_id)}</TableCell>
                                    <TableCell>{route.distance} km</TableCell>
                                    <TableCell>{route.estimated_journey_hours} hr</TableCell>
                                    <TableCell>{route.fare.toLocaleString()} TZS</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {route.is_active ? (
                                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <X className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleViewRoute(route)} title="View Details">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(route)} title="Edit Route">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteDialog(route)}
                                                title="Delete Route"
                                                className="text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">
                        Showing {filteredRoutes.length} of {pagination.totalItems} routes
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage <= 1}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Previous
                        </Button>
                        <div className="text-sm">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                            disabled={currentPage >= pagination.totalPages}
                        >
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* View Route Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Route Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected route.</DialogDescription>
                    </DialogHeader>
                    {isLoadingRouteDetails ? (
                        <div className="py-6 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : viewingRoute ? (
                        <div className="py-4">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-medium">{viewingRoute.name}</h3>
                                <div className="text-sm text-muted-foreground">
                                    {getBusStopName(viewingRoute.start_point_id)} to {getBusStopName(viewingRoute.end_point_id)}
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
                                            <h4 className="text-sm font-medium mb-1">Distance</h4>
                                            <p className="text-sm">{viewingRoute.distance} km</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Journey Time</h4>
                                            <p className="text-sm">{viewingRoute.estimated_journey_hours} hours</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Fare</h4>
                                            <p className="text-sm">{viewingRoute.fare.toLocaleString()} TZS</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Status</h4>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    viewingRoute.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                }`}
                                            >
                        {viewingRoute.is_active ? "Active" : "Inactive"}
                      </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Route ID</h4>
                                            <p className="text-sm">{viewingRoute.id}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Start Point ID</h4>
                                            <p className="text-sm">{viewingRoute.start_point_id}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">End Point ID</h4>
                                            <p className="text-sm">{viewingRoute.end_point_id}</p>
                                        </div>
                                    </div>

                                    {viewingRoute.created_at && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Created At</h4>
                                            <p className="text-sm">{new Date(viewingRoute.created_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                    {viewingRoute.updated_at && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                                            <p className="text-sm">{new Date(viewingRoute.updated_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="map" className="h-[300px] mt-4">
                                    {viewingRoute && (
                                        <div className="h-full w-full relative rounded-md overflow-hidden border">
                                            {viewingRoute.start_point_id && viewingRoute.end_point_id ? (
                                                <iframe
                                                    title={`Route from ${getBusStopName(viewingRoute.start_point_id)} to ${getBusStopName(viewingRoute.end_point_id)}`}
                                                    width="100%"
                                                    height="100%"
                                                    frameBorder="0"
                                                    scrolling="no"
                                                    marginHeight={0}
                                                    marginWidth={0}
                                                    src={`https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=${busStops.find((stop) => stop.id === viewingRoute.start_point_id)?.latitude},${busStops.find((stop) => stop.id === viewingRoute.start_point_id)?.longitude}&destination=${busStops.find((stop) => stop.id === viewingRoute.end_point_id)?.latitude},${busStops.find((stop) => stop.id === viewingRoute.end_point_id)?.longitude}&mode=driving`}
                                                ></iframe>
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-muted/20">
                                                    <div className="text-center">
                                                        <Map className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                                                        <p className="text-muted-foreground">Route map could not be displayed</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Missing coordinates for start or end point
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-muted-foreground">No route data available</div>
                    )}
                    <DialogFooter className="gap-2">
                        {viewingRoute && (
                            <Button variant="outline" onClick={() => handleAddEdit(viewingRoute)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Route Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{selectedRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
                        <DialogDescription>
                            {selectedRoute ? "Update the route details below." : "Fill in the details to add a new route."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Route Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Downtown to Airport"
                                    required
                                    className={formErrors.name ? "border-red-500" : ""}
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_point_id">
                                        Start Point <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={String(formData.start_point_id)}
                                        onValueChange={(value) => handleSelectChange("start_point_id", value)}
                                        disabled={isLoadingBusStops}
                                    >
                                        <SelectTrigger className={formErrors.start_point_id ? "border-red-500" : ""}>
                                            <SelectValue placeholder={isLoadingBusStops ? "Loading bus stops..." : "Select start point"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingBusStops ? (
                                                <div className="flex items-center justify-center py-2">
                                                    <LoadingSpinner size="sm" className="mr-2" />
                                                    <span>Loading bus stops...</span>
                                                </div>
                                            ) : isErrorBusStops ? (
                                                <div className="text-center py-2 text-red-500">Failed to load bus stops</div>
                                            ) : busStops.length === 0 ? (
                                                <div className="text-center py-2">No bus stops available</div>
                                            ) : (
                                                busStops.map((stop) => (
                                                    <SelectItem key={stop.id} value={String(stop.id)}>
                                                        {stop.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.start_point_id && <p className="text-sm text-red-500">{formErrors.start_point_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_point_id">
                                        End Point <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={String(formData.end_point_id)}
                                        onValueChange={(value) => handleSelectChange("end_point_id", value)}
                                        disabled={isLoadingBusStops}
                                    >
                                        <SelectTrigger className={formErrors.end_point_id ? "border-red-500" : ""}>
                                            <SelectValue placeholder={isLoadingBusStops ? "Loading bus stops..." : "Select end point"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingBusStops ? (
                                                <div className="flex items-center justify-center py-2">
                                                    <LoadingSpinner size="sm" className="mr-2" />
                                                    <span>Loading bus stops...</span>
                                                </div>
                                            ) : isErrorBusStops ? (
                                                <div className="text-center py-2 text-red-500">Failed to load bus stops</div>
                                            ) : busStops.length === 0 ? (
                                                <div className="text-center py-2">No bus stops available</div>
                                            ) : (
                                                busStops.map((stop) => (
                                                    <SelectItem key={stop.id} value={String(stop.id)}>
                                                        {stop.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.end_point_id && <p className="text-sm text-red-500">{formErrors.end_point_id}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="distance">
                                        Distance (km) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="distance"
                                        type="number"
                                        value={formData.distance}
                                        onChange={handleInputChange}
                                        min="0.1"
                                        step="0.1"
                                        required
                                        className={formErrors.distance ? "border-red-500" : ""}
                                    />
                                    {formErrors.distance && <p className="text-sm text-red-500">{formErrors.distance}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="estimated_journey_hours">
                                        Journey Time (hours) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="estimated_journey_hours"
                                        type="number"
                                        value={formData.estimated_journey_hours}
                                        onChange={handleInputChange}
                                        min="0.1"
                                        step="0.1"
                                        required
                                        className={formErrors.estimated_journey_hours ? "border-red-500" : ""}
                                    />
                                    {formErrors.estimated_journey_hours && (
                                        <p className="text-sm text-red-500">{formErrors.estimated_journey_hours}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fare">
                                        Fare (TZS) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="fare"
                                        type="number"
                                        value={formData.fare}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="100"
                                        required
                                        className={formErrors.fare ? "border-red-500" : ""}
                                    />
                                    {formErrors.fare && <p className="text-sm text-red-500">{formErrors.fare}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="is_active">Active Status</Label>
                                        <Switch
                                            id="is_active"
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {formData.is_active ? "Route is active and available" : "Route is inactive and unavailable"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {selectedStartPoint && selectedEndPoint && (
                            <div className="mt-4">
                                <Label className="mb-2 block">Route Preview</Label>
                                <div className="h-[200px] w-full relative rounded-md overflow-hidden border">
                                    <iframe
                                        title="Route Preview"
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        scrolling="no"
                                        marginHeight={0}
                                        marginWidth={0}
                                        src={`https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=${selectedStartPoint.latitude},${selectedStartPoint.longitude}&destination=${selectedEndPoint.latitude},${selectedEndPoint.longitude}&mode=driving`}
                                    ></iframe>
                                    <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded-md text-xs font-medium shadow-md">
                                        Distance: {formData.distance} km • Est. Time: {formData.estimated_journey_hours} hours
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createRouteMutation.isPending || updateRouteMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createRouteMutation.isPending || updateRouteMutation.isPending}>
                                {createRouteMutation.isPending || updateRouteMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedRoute ? "Updating..." : "Creating..."}
                                    </>
                                ) : selectedRoute ? (
                                    "Update Route"
                                ) : (
                                    "Create Route"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the route "{selectedRoute?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteRouteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleteRouteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteRouteMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
