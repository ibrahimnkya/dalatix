"use client"

import type React from "react"

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
    DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Plus,
    Search,
    Filter,
    Download,
    Edit,
    Trash2,
    Eye,
    Wifi,
    WifiOff,
    AlertTriangle,
    Truck,
    Calendar,
    Clock,
    Smartphone,
    Signal,
    BatteryMedium,
    Info,
    MapPin,
    RotateCw,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getDevices, createDevice, updateDevice, deleteDevice, getDevice } from "@/lib/services/device"
import { getVehicles } from "@/lib/services/vehicle"
import { PageHeader } from "@/components/page-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Device, DeviceStatus, CreateDeviceData } from "@/types/device"
import type { Vehicle } from "@/types/vehicle"

export default function DevicesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [openDialog, setOpenDialog] = useState(false)
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
    const [viewDeviceId, setViewDeviceId] = useState<number | null>(null)
    const [formData, setFormData] = useState<CreateDeviceData>({
        name: "",
        serial_number: "",
        type: "mounted",
        status: "active",
        vehicle_id: null,
        fcm_token: null,
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Fetch devices with React Query
    const {
        data: devicesData,
        isLoading: isLoadingDevices,
        error: devicesError,
    } = useQuery({
        queryKey: ["devices"],
        queryFn: () => getDevices({ paginate: true }),
    })

    // Add this right after the devices query
    useEffect(() => {
        if (devicesData) {
            console.log("Devices API response:", devicesData)
        }
    }, [devicesData])

    // Fetch vehicles with React Query
    const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ["vehicles"],
        queryFn: () => getVehicles({ paginate: false }),
    })

    // Add a useEffect to debug the vehicles data structure
    useEffect(() => {
        if (vehiclesData) {
            console.log("Vehicles API response:", vehiclesData)
        }
    }, [vehiclesData])

    // Fetch single device details when viewing
    const {
        data: viewDeviceData,
        isLoading: isLoadingDeviceDetails,
        error: deviceDetailsError,
        refetch: refetchDeviceDetails,
    } = useQuery({
        queryKey: ["device", viewDeviceId],
        queryFn: () => (viewDeviceId ? getDevice(viewDeviceId) : Promise.resolve(null)),
        enabled: viewDeviceId !== null,
    })

    // Create device mutation
    const createDeviceMutation = useMutation({
        mutationFn: createDevice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["devices"] })
            toast({
                title: "Device created",
                description: `${formData.name} has been added.`,
            })
            setOpenDialog(false)
            resetForm()
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create device. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Update device mutation
    const updateDeviceMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateDevice(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["devices"] })
            toast({
                title: "Device updated",
                description: `${formData.name} has been updated.`,
            })
            setOpenDialog(false)
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update device. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Delete device mutation
    const deleteDeviceMutation = useMutation({
        mutationFn: deleteDevice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["devices"] })
            toast({
                title: "Device deleted",
                description: "Device has been deleted successfully.",
            })
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete device. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Extract devices and vehicles data
    // Ensure devices is always an array by checking the structure of the response
    const devices = Array.isArray(devicesData?.data)
        ? devicesData.data
        : Array.isArray(devicesData?.data?.data)
            ? devicesData.data.data
            : []

    // Update the vehicles extraction to handle different API response structures
    const vehicles = Array.isArray(vehiclesData?.data)
        ? vehiclesData.data
        : Array.isArray(vehiclesData?.data?.data)
            ? vehiclesData.data.data
            : []

    // Get the device details for viewing
    const viewDevice = viewDeviceData?.data || null

    // Calculate stats
    const stats = {
        total: devices?.length || 0,
        active: devices?.filter((d) => d?.status === "active")?.length || 0,
        offline: devices?.filter((d) => d?.status === "offline")?.length || 0,
        maintenance: devices?.filter((d) => d?.status === "maintenance")?.length || 0,
        inactive: devices?.filter((d) => d?.status === "inactive")?.length || 0,
    }

    const filteredDevices = devices.filter((device) => {
        if (!device) return false

        // Filter by search query
        const name = (device.name || "").toLowerCase()
        const serialNumber = (device.serial_number || "").toLowerCase()
        const type = (device.type || "").toLowerCase()
        const query = searchQuery.toLowerCase()

        return name.includes(query) || serialNumber.includes(query) || type.includes(query)
    })

    const resetForm = () => {
        setFormData({
            name: "",
            serial_number: "",
            type: "mounted",
            status: "active",
            vehicle_id: null,
            fcm_token: null,
        })
        setFormErrors({})
    }

    const handleAddEdit = (device?: Device) => {
        if (device) {
            setSelectedDevice(device)
            setFormData({
                name: device.name,
                serial_number: device.serial_number,
                type: device.type,
                status: device.status,
                vehicle_id: device.vehicle_id || null,
                fcm_token: device.fcm_token || null,
            })
        } else {
            setSelectedDevice(null)
            resetForm()
        }
        setOpenDialog(true)
    }

    const handleViewDevice = (deviceId: number) => {
        setViewDeviceId(deviceId)
        setViewDialogOpen(true)
    }

    const handleDelete = async (device: Device) => {
        if (!device || !device.id) {
            toast({
                title: "Error",
                description: "Invalid device data",
                variant: "destructive",
            })
            return
        }

        if (confirm(`Are you sure you want to delete ${device.name}?`)) {
            deleteDeviceMutation.mutate(device.id)
        }
    }

    const validateField = (name: string, value: any): string => {
        switch (name) {
            case "name":
                return value.trim() === "" ? "Device name is required" : ""
            case "serial_number":
                return value.trim() === "" ? "Serial number is required" : ""
            case "vehicle_id":
                return formData.type === "mounted" && !value ? "Vehicle is required for mounted devices" : ""
            default:
                return ""
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target
        setFormData({ ...formData, [id]: value })

        // Clear error when user starts typing
        const error = validateField(id, value)
        setFormErrors({ ...formErrors, [id]: error })
    }

    const handleSelectChange = (id: string, value: string) => {
        let parsedValue: any = value

        if (id === "vehicle_id") {
            parsedValue = value ? Number.parseInt(value, 10) : null
        }

        setFormData({ ...formData, [id]: parsedValue })

        // Clear error when user makes a selection
        const error = validateField(id, parsedValue)
        setFormErrors({ ...formErrors, [id]: error })
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        // Validate all fields
        errors.name = validateField("name", formData.name)
        errors.serial_number = validateField("serial_number", formData.serial_number)

        // Vehicle is required for mounted devices
        if (formData.type === "mounted") {
            errors.vehicle_id = validateField("vehicle_id", formData.vehicle_id)
        }

        // Check if there are any errors
        const hasErrors = Object.values(errors).some((error) => error !== "")
        setFormErrors(errors)

        return !hasErrors
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please fix the errors in the form.",
                variant: "destructive",
            })
            return
        }

        try {
            if (selectedDevice && selectedDevice.id) {
                // Update existing device
                updateDeviceMutation.mutate({
                    id: selectedDevice.id,
                    data: formData,
                })
            } else {
                // Create new device
                createDeviceMutation.mutate(formData)
            }
        } catch (error) {
            console.error("Error in form submission:", error)
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

    const getStatusClass = (status: DeviceStatus) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            case "offline":
                return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            case "maintenance":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
            case "inactive":
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
        }
    }

    // Update the getVehicleInfo function to be more defensive
    const getVehicleInfo = (vehicleId: number | null | undefined): string => {
        if (!vehicleId) return "Not Assigned"

        if (!Array.isArray(vehicles)) {
            console.error("Vehicles is not an array:", vehicles)
            return `Vehicle ${vehicleId}`
        }

        const vehicle = vehicles.find((v: Vehicle) => v && v.id === vehicleId)
        return vehicle
            ? `${vehicle.registration_number || "Unknown"} (${vehicle.name || "Unnamed"})`
            : `Vehicle ${vehicleId}`
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Devices Management"
                description="Manage all tracking devices in the system"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Device
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All registered devices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <Wifi className="h-4 w-4 mr-2 text-green-500" />
                            <div className="text-2xl font-bold">{stats.active}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Currently connected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Offline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <WifiOff className="h-4 w-4 mr-2 text-red-500" />
                            <div className="text-2xl font-bold">{stats.offline}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                            <div className="text-2xl font-bold">{stats.maintenance}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Require attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <WifiOff className="h-4 w-4 mr-2 text-gray-500" />
                            <div className="text-2xl font-bold">{stats.inactive}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Deactivated devices</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search devices..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {isLoadingDevices ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            ) : devicesError ? (
                <div className="flex justify-center items-center h-64 text-red-500">
                    Error loading devices. Please try again.
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned Vehicle</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDevices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No devices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDevices.map((device) => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-medium">{device.id}</TableCell>
                                        <TableCell>{device.name}</TableCell>
                                        <TableCell>{device.serial_number}</TableCell>
                                        <TableCell className="capitalize">{device.type}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(device.status)}
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(
                                                        device.status,
                                                    )}`}
                                                >
                          {device.status}
                        </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {device.vehicle_id ? (
                                                <div className="flex items-center gap-2">
                                                    <Truck className="h-4 w-4 text-blue-500" />
                                                    {getVehicleInfo(device.vehicle_id)}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">Not Assigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="View Details"
                                                    onClick={() => handleViewDevice(device.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleAddEdit(device)} title="Edit Device">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(device)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete Device"
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
            )}

            {/* Add/Edit Device Dialog */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedDevice ? "Edit Device" : "Add New Device"}</DialogTitle>
                        <DialogDescription>
                            {selectedDevice ? "Update the device details below." : "Fill in the details to add a new device."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Device Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="GPS Tracker 001"
                                        required
                                        className={formErrors.name ? "border-red-500" : ""}
                                    />
                                    {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serial_number">Serial Number</Label>
                                    <Input
                                        id="serial_number"
                                        value={formData.serial_number}
                                        onChange={handleInputChange}
                                        placeholder="SN12345678"
                                        required
                                        className={formErrors.serial_number ? "border-red-500" : ""}
                                    />
                                    {formErrors.serial_number && <p className="text-xs text-red-500">{formErrors.serial_number}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Device Type</Label>
                                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mounted">Mounted</SelectItem>
                                            <SelectItem value="handheld">Handheld</SelectItem>
                                            <SelectItem value="fixed">Fixed</SelectItem>
                                            <SelectItem value="mobile">Mobile</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => handleSelectChange("status", value as DeviceStatus)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="offline">Offline</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle_id">
                                    Assigned Vehicle {formData.type === "mounted" && <span className="text-red-500">*</span>}
                                </Label>
                                <Select
                                    value={formData.vehicle_id?.toString() || "0"}
                                    onValueChange={(value) => handleSelectChange("vehicle_id", value)}
                                >
                                    <SelectTrigger className={formErrors.vehicle_id ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Not Assigned</SelectItem>
                                        {isLoadingVehicles ? (
                                            <SelectItem value="" disabled>
                                                Loading vehicles...
                                            </SelectItem>
                                        ) : (
                                            vehicles.map((vehicle: Vehicle) => (
                                                <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                    {vehicle.registration_number} - {vehicle.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                                {formErrors.vehicle_id && <p className="text-xs text-red-500">{formErrors.vehicle_id}</p>}
                                {formData.type === "mounted" && (
                                    <p className="text-xs text-muted-foreground">Vehicle assignment is required for mounted devices</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" type="button" onClick={() => setOpenDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createDeviceMutation.isPending || updateDeviceMutation.isPending}>
                                {createDeviceMutation.isPending || updateDeviceMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedDevice ? "Updating..." : "Creating..."}
                                    </>
                                ) : selectedDevice ? (
                                    "Update Device"
                                ) : (
                                    "Create Device"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Device Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
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
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : deviceDetailsError ? (
                        <div className="text-center py-8 text-red-500">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                            <p>Error loading device details. Please try again.</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchDeviceDetails()}>
                                <RotateCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    ) : viewDevice ? (
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid grid-cols-3 mb-4">
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="status">Status</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold">{viewDevice.name}</h3>
                                        <p className="text-sm text-muted-foreground">Serial: {viewDevice.serial_number}</p>
                                    </div>
                                    <Badge className={getStatusClass(viewDevice.status)}>
                                        {getStatusIcon(viewDevice.status)}
                                        <span className="ml-1">{viewDevice.status}</span>
                                    </Badge>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Device Information</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">ID:</span>
                                                <span className="text-sm">{viewDevice.id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Smartphone className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Type:</span>
                                                <span className="text-sm capitalize">{viewDevice.type}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Signal className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">FCM Token:</span>
                                                <span className="text-sm truncate max-w-[200px]">
                          {viewDevice.fcm_token || "Not available"}
                        </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Assignment</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">Vehicle:</span>
                                                <span className="text-sm">
                          {viewDevice.vehicle_id ? getVehicleInfo(viewDevice.vehicle_id) : "Not assigned"}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Timestamps</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Created:</span>
                                            <span className="text-sm">{formatDate(viewDevice.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Updated:</span>
                                            <span className="text-sm">{formatDate(viewDevice.updated_at)}</span>
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
                                                {getStatusIcon(viewDevice.status)}
                                                <span
                                                    className={`font-medium ${
                                                        viewDevice.status === "active"
                                                            ? "text-green-600"
                                                            : viewDevice.status === "offline"
                                                                ? "text-red-600"
                                                                : viewDevice.status === "maintenance"
                                                                    ? "text-amber-600"
                                                                    : "text-gray-600"
                                                    }`}
                                                >
                          {viewDevice.status === "active"
                              ? "Connected"
                              : viewDevice.status === "offline"
                                  ? "Disconnected"
                                  : viewDevice.status === "maintenance"
                                      ? "In Maintenance"
                                      : "Inactive"}
                        </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Last updated: {formatDate(viewDevice.updated_at)}
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
                            <Info className="h-8 w-8 mx-auto mb-2" />
                            <p>No device information available.</p>
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                        {viewDevice && (
                            <Button
                                onClick={() => {
                                    setViewDialogOpen(false)
                                    handleAddEdit(viewDevice)
                                }}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Device
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
