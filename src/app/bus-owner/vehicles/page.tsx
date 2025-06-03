"use client"

import React from "react"

import type { Vehicle } from "@/types/vehicle"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTitle } from "@/context/TitleContext"
import { usePermissions } from "@/hooks/use-permissions"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getVehicles, getVehicle } from "@/lib/services/vehicle"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    Search,
    Download,
    Eye,
    ChevronDown,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Bus,
    User,
    Smartphone,
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function BusOwnerVehiclesPage() {
    const { setTitle } = useTitle()
    const { toast } = useToast()
    const { companyId, isBusOwner } = usePermissions()

    // State for search, filters, and pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(10)

    // State for dialogs
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)

    useEffect(() => {
        setTitle("My Vehicles")
    }, [setTitle])

    // Fetch vehicles with React Query - filtered by company
    const {
        data: vehiclesData,
        isLoading: isLoadingVehicles,
        isError: isErrorVehicles,
        refetch: refetchVehicles,
    } = useQuery({
        queryKey: ["vehicles", currentPage, pageSize, statusFilter, companyId],
        queryFn: async () => {
            if (!companyId) {
                console.warn("No company ID available for filtering vehicles")
                return { data: [], meta: { total: 0, current_page: 1, last_page: 1, per_page: pageSize } }
            }

            const response = await getVehicles({
                paginate: true,
                page: currentPage,
                per_page: pageSize,
                is_active: statusFilter.length === 1 ? (statusFilter[0] === "active" ? true : false) : undefined,
                company_id: companyId, // Filter by company ID
            })
            console.log("Vehicles API Response:", response)
            return response
        },
        enabled: !!companyId, // Only fetch when company ID is available
    })

    // Fetch single vehicle details
    const {
        data: vehicleDetails,
        isLoading: isLoadingVehicleDetails,
        isError: isErrorVehicleDetails,
        refetch: refetchVehicleDetails,
    } = useQuery({
        queryKey: ["vehicle", viewingVehicle?.id],
        queryFn: () => (viewingVehicle?.id ? getVehicle(viewingVehicle.id) : null),
        enabled: !!viewingVehicle?.id,
    })

    // Update the vehicles extraction logic to handle different response structures
    const vehicles = React.useMemo(() => {
        if (!vehiclesData) return []

        // Check if data is directly an array
        if (Array.isArray(vehiclesData.data)) {
            return vehiclesData.data
        }

        // Check if data is nested in data property
        if (vehiclesData.data && Array.isArray(vehiclesData.data.data)) {
            return vehiclesData.data.data
        }

        // If data is in another format, log it and return empty array
        console.error("Unexpected vehicles data format:", vehiclesData)
        return []
    }, [vehiclesData])

    // Update the pagination extraction logic
    const pagination = React.useMemo(() => {
        if (!vehiclesData) {
            return {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                perPage: pageSize,
            }
        }

        // Check if meta is at the root level
        if (vehiclesData.meta) {
            return {
                currentPage: vehiclesData.meta.current_page || 1,
                totalPages: vehiclesData.meta.last_page || 1,
                totalItems: vehiclesData.meta.total || 0,
                perPage: vehiclesData.meta.per_page || pageSize,
            }
        }

        // Check if meta is nested in data
        if (vehiclesData.data && vehiclesData.data.meta) {
            return {
                currentPage: vehiclesData.data.meta.current_page || 1,
                totalPages: vehiclesData.data.meta.last_page || 1,
                totalItems: vehiclesData.data.meta.total || 0,
                perPage: vehiclesData.data.meta.per_page || pageSize,
            }
        }

        return {
            currentPage: 1,
            totalPages: 1,
            totalItems: vehicles.length,
            perPage: pageSize,
        }
    }, [vehiclesData, vehicles.length, pageSize])

    // Calculate stats
    const stats = {
        total: Array.isArray(vehicles) ? vehicles.length : 0,
        active: Array.isArray(vehicles) ? vehicles.filter((vehicle) => vehicle && vehicle.is_active).length : 0,
        inactive: Array.isArray(vehicles) ? vehicles.filter((vehicle) => vehicle && !vehicle.is_active).length : 0,
    }

    // Filter vehicles based on search query
    const filteredVehicles = React.useMemo(() => {
        return vehicles.filter((vehicle: Vehicle) => {
            if (!vehicle) return false

            // Filter by search query
            const name = (vehicle.name || "").toLowerCase()
            const regNumber = (vehicle.registration_number || "").toLowerCase()
            const model = (vehicle.model || "").toLowerCase()
            const plateNumber = (vehicle.plate_number || "").toLowerCase()
            const query = searchQuery.toLowerCase()
            const matchesSearch =
                name.includes(query) || regNumber.includes(query) || model.includes(query) || plateNumber.includes(query)

            // Filter by status
            const matchesStatus =
                statusFilter.length === 0 ||
                (statusFilter.includes("active") && vehicle.is_active) ||
                (statusFilter.includes("inactive") && !vehicle.is_active)

            return matchesSearch && matchesStatus
        })
    }, [vehicles, searchQuery, statusFilter])

    // Handle opening the view dialog
    const handleViewVehicle = (vehicle: Vehicle) => {
        setViewingVehicle(vehicle)
        setIsViewDialogOpen(true)
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

    // Show loading state if no company ID
    if (!companyId) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center h-64">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-4 text-yellow-500" />
                    <p className="text-muted-foreground">Loading company information...</p>
                </div>
            </div>
        )
    }

    // Loading state
    if (isLoadingVehicles) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    // Error state
    if (isErrorVehicles) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Error loading vehicles. Please try again.</span>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetchVehicles()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="My Vehicles"
                description="Manage your company's vehicles"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchVehicles()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>

                    </div>
                }
                className="mb-6"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                        <Bus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All your vehicles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                        <Bus className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive Vehicles</CardTitle>
                        <Bus className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inactive}</div>
                        <p className="text-xs text-muted-foreground">Not in service</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search vehicles..."
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


                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Registration/Plate</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredVehicles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {searchQuery || statusFilter.length > 0
                                        ? "No vehicles found matching your criteria."
                                        : "No vehicles found for your company."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredVehicles.map((vehicle: Vehicle) => (
                                <TableRow key={vehicle.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center">
                                            <Bus className="h-4 w-4 mr-2 text-blue-600" />
                                            {vehicle.name || vehicle.model || "Unknown Vehicle"}
                                        </div>
                                    </TableCell>
                                    <TableCell>{vehicle.registration_number || vehicle.plate_number || "N/A"}</TableCell>
                                    <TableCell>{vehicle.model || "N/A"}</TableCell>
                                    <TableCell>{vehicle.capacity ? `${vehicle.capacity} seats` : "N/A"}</TableCell>
                                    <TableCell>
                    <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vehicle.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {vehicle.is_active ? "Active" : "Inactive"}
                    </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewVehicle(vehicle)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
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
                        Showing {filteredVehicles.length} of {pagination.totalItems} vehicles
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

            {/* View Vehicle Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Vehicle Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected vehicle.</DialogDescription>
                    </DialogHeader>
                    {isLoadingVehicleDetails ? (
                        <div className="py-6 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : viewingVehicle ? (
                        <div className="py-4">
                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-lg font-medium">{viewingVehicle.name || viewingVehicle.model}</h3>
                                <div className="text-sm text-muted-foreground">
                                    {viewingVehicle.registration_number || viewingVehicle.plate_number}
                                </div>
                            </div>

                            <Tabs defaultValue="details">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="details">Details</TabsTrigger>
                                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                                </TabsList>
                                <TabsContent value="details" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Model</h4>
                                            <p className="text-sm">{viewingVehicle.model || "N/A"}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Capacity</h4>
                                            <p className="text-sm">{viewingVehicle.capacity ? `${viewingVehicle.capacity} seats` : "N/A"}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Status</h4>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    viewingVehicle.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                }`}
                                            >
                        {viewingVehicle.is_active ? "Active" : "Inactive"}
                      </span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Vehicle ID</h4>
                                            <p className="text-sm">{viewingVehicle.id}</p>
                                        </div>
                                    </div>

                                    {viewingVehicle.last_maintenance_date && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Last Maintenance</h4>
                                            <p className="text-sm">{new Date(viewingVehicle.last_maintenance_date).toLocaleDateString()}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {viewingVehicle.created_at && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-1">Registered</h4>
                                                <p className="text-sm">{new Date(viewingVehicle.created_at).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                        {viewingVehicle.updated_at && (
                                            <div>
                                                <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                                                <p className="text-sm">{new Date(viewingVehicle.updated_at).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="assignments" className="space-y-4 mt-4">
                                    <div>
                                        <h4 className="text-sm font-medium mb-1">Conductor</h4>
                                        {viewingVehicle.conductor ? (
                                            <div className="flex items-center">
                                                <User className="h-4 w-4 mr-2" />
                                                <span>
                          {viewingVehicle.conductor.first_name} {viewingVehicle.conductor.last_name}
                        </span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No conductor assigned</p>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium mb-1">Device</h4>
                                        {viewingVehicle.device ? (
                                            <div className="flex items-center">
                                                <Smartphone className="h-4 w-4 mr-2" />
                                                <span>
                          {viewingVehicle.device.name} ({viewingVehicle.device.serial_number})
                        </span>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No device assigned</p>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-muted-foreground">No vehicle data available</div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
