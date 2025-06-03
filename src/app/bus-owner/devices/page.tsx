"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import {
    Calendar,
    Search,
    Smartphone,
    Eye,
    RefreshCcw,
    MapPin,
    Clock,
    Bus,
    ChevronLeft,
    ChevronRight,
    Download,
    Wifi,
    WifiOff,
    AlertTriangle,
    Signal,
    BatteryMedium,
    Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getDevices, getDevice } from "@/lib/services/device"
import { getVehicles } from "@/lib/services/vehicle"
import type { Device, DeviceStatus } from "@/types/device"
import type { Vehicle } from "@/types/vehicle"
import { usePermissions } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/page-header"

const ITEMS_PER_PAGE = 10

export default function BusOwnerDevicesPage() {
    const { toast } = useToast()
    const { companyId } = usePermissions()

    // State for search, filters, and pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)

    // State for dialogs
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [viewingDevice, setViewingDevice] = useState<Device | null>(null)

    // Reset to first page when search query or filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter])

    // Fetch all devices for statistics (without pagination)
    const {
        data: allDevicesData,
        isLoading: isLoadingAllDevices,
        refetch: refetchAllDevices,
    } = useQuery({
        queryKey: ["allDevices", companyId],
        queryFn: async () => {
            if (!companyId) {
                console.error("No company ID available")
                return { data: [] }
            }

            const response = await getDevices({
                paginate: false,
                company_id: companyId, // Filter by company ID
            })
            return response
        },
        enabled: !!companyId,
    })

    // Fetch paginated devices for table display
    const {
        data: devicesData,
        isLoading: isLoadingDevices,
        isError: isErrorDevices,
        refetch: refetchDevices,
    } = useQuery({
        queryKey: ["devices", currentPage, ITEMS_PER_PAGE, searchQuery, statusFilter, companyId],
        queryFn: async () => {
            if (!companyId) {
                console.error("No company ID available")
                return { data: [] }
            }

            const params: any = {
                paginate: true,
                page: currentPage,
                per_page: ITEMS_PER_PAGE,
                company_id: companyId, // Filter by company ID
            }

            if (searchQuery.trim()) {
                params.search = searchQuery.trim()
            }

            if (statusFilter.length === 1) {
                params.status = statusFilter[0]
            }

            const response = await getDevices(params)
            console.log("Paginated Devices API Response:", response)
            return response
        },
        enabled: !!companyId,
    })

    // Fetch vehicles for displaying vehicle info
    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ["vehicles", companyId],
        queryFn: async () => {
            if (!companyId) {
                console.error("No company ID available")
                return { data: [] }
            }

            const response = await getVehicles({
                paginate: false,
                company_id: companyId, // Filter by company ID
            })
            return response
        },
        enabled: !!companyId,
    })

    // Fetch single device details
    const {
        data: deviceDetails,
        isLoading: isLoadingDeviceDetails,
        isError: isErrorDeviceDetails,
        refetch: refetchDeviceDetails,
    } = useQuery({
        queryKey: ["device", viewingDevice?.id],
        queryFn: () => (viewingDevice?.id ? getDevice(viewingDevice.id) : null),
        enabled: !!viewingDevice?.id,
    })

    // Extract all devices for statistics calculation
    const allDevices = Array.isArray(allDevicesData?.data)
        ? allDevicesData.data
        : allDevicesData?.data?.data && Array.isArray(allDevicesData.data.data)
            ? allDevicesData.data.data
            : []

    // Extract paginated devices for table display
    const devices = Array.isArray(devicesData?.data)
        ? devicesData.data
        : devicesData?.data?.data && Array.isArray(devicesData.data.data)
            ? devicesData.data.data
            : []

    // Extract vehicles array from the response
    const vehicles = Array.isArray(vehiclesData?.data)
        ? vehiclesData.data
        : vehiclesData?.data?.data && Array.isArray(vehiclesData.data.data)
            ? vehiclesData.data.data
            : []

    // Extract pagination data from server response
    const pagination = {
        currentPage: devicesData?.data?.current_page || devicesData?.meta?.current_page || 1,
        totalPages: devicesData?.data?.last_page || devicesData?.meta?.last_page || 1,
        totalItems: devicesData?.data?.total || devicesData?.meta?.total || 0,
        perPage: devicesData?.data?.per_page || devicesData?.meta?.per_page || ITEMS_PER_PAGE,
        from: devicesData?.data?.from || devicesData?.meta?.from || 0,
        to: devicesData?.data?.to || devicesData?.meta?.to || 0,
    }

    // Calculate actual device statistics from ALL devices
    const getDeviceStats = () => {
        if (!Array.isArray(allDevices) || allDevices.length === 0) {
            return { total: 0, active: 0, offline: 0, maintenance: 0, inactive: 0 }
        }

        const stats = allDevices.reduce(
            (acc, device) => {
                if (!device) return acc

                acc.total++

                switch (device.status) {
                    case "active":
                        acc.active++
                        break
                    case "offline":
                        acc.offline++
                        break
                    case "maintenance":
                        acc.maintenance++
                        break
                    case "inactive":
                        acc.inactive++
                        break
                }

                return acc
            },
            { total: 0, active: 0, offline: 0, maintenance: 0, inactive: 0 },
        )

        return stats
    }

    const stats = getDeviceStats()

    // Status color helper
    const getStatusColor = (status: DeviceStatus) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            case "offline":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            case "maintenance":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
            case "inactive":
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
        }
    }

    const getStatusIcon = (status: DeviceStatus) => {
        switch (status) {
            case "active":
                return <Wifi className="h-4 w-4 text-green-500" />
            case "offline":
                return <WifiOff className="h-4 w-4 text-red-500" />
            case "maintenance":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case "inactive":
                return <WifiOff className="h-4 w-4 text-gray-500" />
            default:
                return <WifiOff className="h-4 w-4 text-red-500" />
        }
    }

    // Get vehicle info
    const getVehicleInfo = (vehicleId: number | null | undefined): string => {
        if (!vehicleId) return "Not Assigned"

        if (!Array.isArray(vehicles)) {
            return `Vehicle ${vehicleId}`
        }

        const vehicle = vehicles.find((v: Vehicle) => v && v.id === vehicleId)
        return vehicle
            ? `${vehicle.registration_number || "Unknown"} (${vehicle.name || "Unnamed"})`
            : `Vehicle ${vehicleId}`
    }

    // Handle opening the view dialog
    const handleViewDevice = (device: Device) => {
        setViewingDevice(device)
        setIsViewDialogOpen(true)
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
        refetchDevices()
        refetchAllDevices()
    }

    // Format date for display
    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return "N/A"
        try {
            const date = new Date(dateString)
            return date.toLocaleString()
        } catch (error) {
            return dateString
        }
    }

    // Loading state when company ID is not available
    if (!companyId) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <PageHeader
                    title="My Devices"
                    description="View all tracking devices assigned to your company"
                    icon={<Smartphone className="h-6 w-6" />}
                />
                <Card>
                    <CardContent className="py-10">
                        <div className="flex flex-col items-center justify-center text-center">
                            <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                            <h3 className="text-lg font-medium">Company information not available</h3>
                            <p className="text-sm text-muted-foreground mt-1">Please contact support if this issue persists.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader
                title="My Devices"
                description="View all tracking devices assigned to your company"
                icon={<Smartphone className="h-6 w-6" />}
                actions={
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" onClick={handleRefresh}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllDevices ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.total}</div>
                        )}
                        <p className="text-xs text-muted-foreground">All registered devices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Wifi className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllDevices ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.active}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Currently connected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Offline</CardTitle>
                        <WifiOff className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllDevices ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.offline}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Not connected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllDevices ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.maintenance}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Require attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                        <WifiOff className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoadingAllDevices ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.inactive}</div>
                        )}
                        <p className="text-xs text-muted-foreground">Deactivated devices</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Devices</CardTitle>
                    <CardDescription>View all tracking devices assigned to your company</CardDescription>
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search devices..."
                                className="pl-8 h-9"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Filter className="mr-2 h-4 w-4" />
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
                                        checked={statusFilter.includes("offline")}
                                        onCheckedChange={() => toggleStatusFilter("offline")}
                                    >
                                        Offline
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={statusFilter.includes("maintenance")}
                                        onCheckedChange={() => toggleStatusFilter("maintenance")}
                                    >
                                        Maintenance
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
                    {isLoadingDevices ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="flex space-x-4">
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Serial Number</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Assigned Vehicle</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {devices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    No devices found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            devices.map((device: Device) => (
                                                <TableRow key={device.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center">
                                                            <Smartphone className="h-4 w-4 mr-2 text-blue-500" />
                                                            {device.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono">{device.serial_number}</TableCell>
                                                    <TableCell className="capitalize">{device.type}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={getStatusColor(device.status)}>
                                                            {getStatusIcon(device.status)}
                                                            <span className="ml-1">{device.status}</span>
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {device.vehicle_id ? (
                                                            <div className="flex items-center gap-2">
                                                                <Bus className="h-4 w-4 text-blue-500" />
                                                                {getVehicleInfo(device.vehicle_id)}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-500">Not Assigned</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-2">
                                                            <Button variant="ghost" size="sm" onClick={() => handleViewDevice(device)}>
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

                            {/* Server-side Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between space-x-2 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {pagination.from} to {pagination.to} of {pagination.totalItems} devices
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
                        </>
                    )}
                </CardContent>
            </Card>

            {/* View Device Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            Device Details
                        </DialogTitle>
                        <DialogDescription>Detailed information about the selected device</DialogDescription>
                    </DialogHeader>

                    {isLoadingDeviceDetails ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    ) : viewingDevice ? (
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-4">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="status">Status</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{viewingDevice.name}</h3>
                                        <p className="text-sm text-muted-foreground">Serial: {viewingDevice.serial_number}</p>
                                    </div>
                                    <Badge className={getStatusColor(viewingDevice.status)}>
                                        {getStatusIcon(viewingDevice.status)}
                                        <span className="ml-1">{viewingDevice.status}</span>
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Device Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Type:</span>
                                                <span className="text-sm capitalize">{viewingDevice.type}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Signal className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">FCM Token:</span>
                                                <span className="text-sm truncate max-w-[200px]">
                          {viewingDevice.fcm_token || "Not available"}
                        </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Assignment</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Bus className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Vehicle:</span>
                                                <span className="text-sm">
                          {viewingDevice.vehicle_id ? getVehicleInfo(viewingDevice.vehicle_id) : "Not assigned"}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Timestamps</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Created:</span>
                                            <span className="text-sm">{formatDate(viewingDevice.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Updated:</span>
                                            <span className="text-sm">{formatDate(viewingDevice.updated_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="status" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(viewingDevice.status)}
                                                <span
                                                    className={`font-medium ${
                                                        viewingDevice.status === "active"
                                                            ? "text-green-600"
                                                            : viewingDevice.status === "offline"
                                                                ? "text-red-600"
                                                                : viewingDevice.status === "maintenance"
                                                                    ? "text-amber-600"
                                                                    : "text-gray-600"
                                                    }`}
                                                >
                          {viewingDevice.status === "active"
                              ? "Connected"
                              : viewingDevice.status === "offline"
                                  ? "Disconnected"
                                  : viewingDevice.status === "maintenance"
                                      ? "In Maintenance"
                                      : "Inactive"}
                        </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Last updated: {formatDate(viewingDevice.updated_at)}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Battery Status</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2">
                                                <BatteryMedium className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Unknown</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Battery information not available</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Location</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Unknown</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Location information not available</p>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Signal Strength</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2">
                                                <Signal className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">Unknown</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Signal information not available</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="space-y-4">
                                <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="h-8 w-8 mx-auto mb-2" />
                                    <p>Device history is not available at this time.</p>
                                    <p className="text-sm mt-1">Historical data will be shown here when available.</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Smartphone className="h-8 w-8 mx-auto mb-2" />
                            <p>No device information available.</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
