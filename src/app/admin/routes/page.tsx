"use client"

import type React from "react"
import type { Route, CreateRouteData, UpdateRouteData } from "@/types/route"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { getRoutes, getRoute, createRoute, updateRoute, deleteRoute } from "@/lib/services/route"
import { getBusStops } from "@/lib/services/bus-stop"
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
    ChevronLeft,
    ChevronRight,
    RouteIcon,
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

const ITEMS_PER_PAGE = 10

export default function RoutesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // State for search, filters, and pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)

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

    // Reset to first page when search query or filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    // Fetch all routes for statistics (without pagination)
    const {
        data: allRoutesData,
        isLoading: isLoadingAllRoutes,
        refetch: refetchAllRoutes,
    } = useQuery({
        queryKey: ["allRoutes"],
        queryFn: async () => {
            const response = await getRoutes({
                paginate: false, // Get all routes for statistics
            })
            return response
        },
    })

    // Fetch paginated routes for table display
    const {
        data: routesData,
        isLoading: isLoadingRoutes,
        isError: isErrorRoutes,
        refetch: refetchRoutes,
    } = useQuery({
        queryKey: ["routes", currentPage, ITEMS_PER_PAGE, searchQuery, statusFilter],
        queryFn: async () => {
            // Build query parameters
            const params: any = {
                paginate: true,
                page: currentPage,
                per_page: ITEMS_PER_PAGE,
            }

            // Add search query if provided
            if (searchQuery.trim()) {
                params.search = searchQuery.trim()
            }

            // Add status filter if provided
            if (statusFilter.length === 1) {
                params.is_active = statusFilter[0] === "active"
            }

            const response = await getRoutes(params)
            console.log("Paginated API Response:", response)
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

    // Fetch bus stops for dropdowns
    const {
        data: busStopsData,
        isLoading: isLoadingBusStops,
        isError: isErrorBusStops,
    } = useQuery({
        queryKey: ["busStops"],
        queryFn: async () => {
            const response = await getBusStops({
                paginate: false,
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
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            queryClient.invalidateQueries({ queryKey: ["allRoutes"] })
            refetchRoutes()
            refetchAllRoutes()
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
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            queryClient.invalidateQueries({ queryKey: ["allRoutes"] })
            refetchRoutes()
            refetchAllRoutes()
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
            queryClient.invalidateQueries({ queryKey: ["routes"] })
            queryClient.invalidateQueries({ queryKey: ["allRoutes"] })
            refetchRoutes()
            refetchAllRoutes()
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

    // Extract all routes for statistics calculation
    const allRoutes = Array.isArray(allRoutesData?.data)
        ? allRoutesData.data
        : allRoutesData?.data?.data && Array.isArray(allRoutesData.data.data)
            ? allRoutesData.data.data
            : []

    // Extract paginated routes for table display
    const routes = Array.isArray(routesData?.data)
        ? routesData.data
        : routesData?.data?.data && Array.isArray(routesData.data.data)
            ? routesData.data.data
            : []

    // Extract pagination data from server response
    const pagination = {
        currentPage: routesData?.data?.current_page || routesData?.meta?.current_page || 1,
        totalPages: routesData?.data?.last_page || routesData?.meta?.last_page || 1,
        totalItems: routesData?.data?.total || routesData?.meta?.total || 0,
        perPage: routesData?.data?.per_page || routesData?.meta?.per_page || ITEMS_PER_PAGE,
        from: routesData?.data?.from || routesData?.meta?.from || 0,
        to: routesData?.data?.to || routesData?.meta?.to || 0,
    }

    // Calculate actual route statistics from ALL routes
    const getRouteStats = () => {
        if (!Array.isArray(allRoutes) || allRoutes.length === 0) {
            return { total: 0, active: 0, inactive: 0, totalDistance: 0, avgFare: 0 }
        }

        const stats = allRoutes.reduce(
            (acc, route) => {
                if (!route) return acc

                acc.total++

                if (route.is_active) {
                    acc.active++
                } else {
                    acc.inactive++
                }

                // Calculate total distance
                const distance = typeof route.distance === "number" ? route.distance : Number.parseFloat(route.distance) || 0
                if (!isNaN(distance)) {
                    acc.totalDistance += distance
                }

                // Calculate total fare for average
                const fare = typeof route.fare === "number" ? route.fare : Number.parseFloat(route.fare) || 0
                if (!isNaN(fare)) {
                    acc.totalFare += fare
                    acc.fareCount++
                }

                return acc
            },
            { total: 0, active: 0, inactive: 0, totalDistance: 0, totalFare: 0, fareCount: 0 },
        )

        return {
            total: stats.total,
            active: stats.active,
            inactive: stats.inactive,
            totalDistance: stats.totalDistance,
            avgFare: stats.fareCount > 0 ? stats.totalFare / stats.fareCount : 0,
        }
    }

    const stats = getRouteStats()

    // Status color helper
    const getStatusColor = (isActive: boolean) => {
        return isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
    }

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

        if (formErrors[id]) {
            setFormErrors({ ...formErrors, [id]: "" })
        }

        setFormData({
            ...formData,
            [id]: type === "number" ? Number.parseFloat(value) : value,
        })
    }

    const handleSelectChange = (id: string, value: string) => {
        if (formErrors[id]) {
            setFormErrors({ ...formErrors, [id]: "" })
        }

        if (id === "is_active") {
            setFormData({ ...formData, [id]: value === "true" })
        } else if (id === "start_point_id" || id === "end_point_id") {
            const pointId = Number.parseInt(value)
            setFormData({ ...formData, [id]: pointId })

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

        if (!validateForm()) {
            return
        }

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
            const newFilter = current.includes(status) ? current.filter((s) => s !== status) : [...current, status]
            return newFilter
        })
    }

    // Handle search with debouncing
    const handleSearch = (term: string) => {
        setSearchQuery(term)
    }

    // Handle refresh
    const handleRefresh = () => {
        refetchRoutes()
        refetchAllRoutes()
    }

    // Helper function to safely format currency
    const safeAmount = (amount: any) => {
        if (!amount) return "TZS0"
        const num = Number(amount)
        return isNaN(num) ? "TZS0" : `TZS${num.toLocaleString()}`
    }

    // Loading state
    if (isLoadingRoutes || isLoadingAllRoutes) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Routes Management</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <Skeleton key={index} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (isErrorRoutes) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Routes Management</h2>
                </div>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Error loading routes. Please try again.</span>
                </div>
                <Button variant="outline" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Routes Management</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                    <Button onClick={() => handleAddEdit()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Route
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                        <RouteIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All routes in system</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
                        <RouteIcon className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Routes</CardTitle>
                        <RouteIcon className="h-4 w-4 text-red-500" />
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

            <Card>
                <CardHeader>
                    <CardTitle>Routes</CardTitle>
                    <CardDescription>Manage all transportation routes in the system</CardDescription>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search routes..."
                                className="pl-8 h-9"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
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
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
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
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {routes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No routes found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    routes.map((route: Route) => (
                                        <TableRow key={route.id}>
                                            <TableCell className="font-medium">{route.name}</TableCell>
                                            <TableCell>
                                                {isLoadingBusStops ? <Skeleton className="h-4 w-20" /> : getBusStopName(route.start_point_id)}
                                            </TableCell>
                                            <TableCell>
                                                {isLoadingBusStops ? <Skeleton className="h-4 w-20" /> : getBusStopName(route.end_point_id)}
                                            </TableCell>
                                            <TableCell>{route.distance} km</TableCell>
                                            <TableCell>{route.estimated_journey_hours} hr</TableCell>
                                            <TableCell>{safeAmount(route.fare)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(route.is_active)}>
                                                    {route.is_active ? (
                                                        <>
                                                            <Check className="h-3 w-3 mr-1" />
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X className="h-3 w-3 mr-1" />
                                                            Inactive
                                                        </>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleViewRoute(route)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleAddEdit(route)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDialog(route)}>
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

                    {/* Server-side Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between space-x-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {pagination.from} to {pagination.to} of {pagination.totalItems} routes
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                        .filter((page) => {
                                            return page === 1 || page === pagination.totalPages || Math.abs(page - currentPage) <= 1
                                        })
                                        .map((page, index, array) => (
                                            <div key={page} className="flex items-center">
                                                {index > 0 && array[index - 1] !== page - 1 && (
                                                    <span className="px-2 text-muted-foreground">...</span>
                                                )}
                                                <Button
                                                    variant={currentPage === page ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className="w-8 h-8 p-0"
                                                >
                                                    {page}
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === pagination.totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Keep all the existing dialogs unchanged */}
            {/* View Route Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Route Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected route.</DialogDescription>
                    </DialogHeader>
                    {isLoadingRouteDetails ? (
                        <div className="py-6 flex items-center justify-center">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
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
                                            <p className="text-sm">{safeAmount(viewingRoute.fare)}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Status</h4>
                                            <Badge variant="outline" className={getStatusColor(viewingRoute.is_active)}>
                                                {viewingRoute.is_active ? "Active" : "Inactive"}
                                            </Badge>
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
                                                    <Skeleton className="h-4 w-20" />
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
                                                    <Skeleton className="h-4 w-20" />
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
                                        <Skeleton className="mr-2 h-4 w-4" />
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
                                    <Skeleton className="mr-2 h-4 w-4" />
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
