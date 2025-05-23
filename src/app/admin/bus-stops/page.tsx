"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { getBusStops, getBusStop, createBusStop, updateBusStop, deleteBusStop } from "@/lib/services/bus-stop"
import type { BusStop, BusStopFilters } from "@/types/bus-stop"
import {
    Plus,
    Search,
    Download,
    Edit,
    Trash2,
    Eye,
    MapPin,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    MapIcon,
} from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"

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

// Convert from DMS to decimal degrees
const dmsToDecimal = (dms: string): number | null => {
    // Regular expression to match DMS format
    // Examples: "41° 24' 12.2" N", "2° 10' 26.5" E", "41°24'12.2"N", "2°10'26.5"E"
    const pattern = /^\s*(-?\d+)\s*(?:°|deg)\s*(\d+)\s*(?:'|min)\s*(\d+(?:\.\d+)?)\s*(?:"|sec)?\s*([NSEW])?\s*$/i
    const match = dms.match(pattern)

    if (!match) return null

    const degrees = Number.parseFloat(match[1])
    const minutes = Number.parseFloat(match[2])
    const seconds = Number.parseFloat(match[3])
    const direction = match[4] ? match[4].toUpperCase() : null

    let decimal = degrees + minutes / 60 + seconds / 3600

    // Apply negative sign for South or West
    if (direction === "S" || direction === "W") {
        decimal = -decimal
    } else if (!direction && degrees < 0) {
        // If degrees was explicitly negative, preserve that
        decimal = -decimal
    }

    return Number(decimal.toFixed(6))
}

// Check if a string is in DMS format
const isDMSFormat = (str: string): boolean => {
    const pattern = /^\s*(-?\d+)\s*(?:°|deg)\s*(\d+)\s*(?:'|min)\s*(\d+(?:\.\d+)?)\s*(?:"|sec)?\s*([NSEW])?\s*$/i
    return pattern.test(str)
}

// Helper function to safely format coordinates
const formatCoordinate = (value: any): string => {
    if (value === null || value === undefined) return "N/A"
    return Number(value).toFixed(6)
}

export default function BusStopsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const isMobile = useMobile()

    // State for search, filters, and pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [filters, setFilters] = useState<BusStopFilters>({})
    const [statusFilter, setStatusFilter] = useState<string[]>([])

    // State for dialogs
    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedBusStop, setSelectedBusStop] = useState<BusStop | null>(null)
    const [isExporting, setIsExporting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        latitude: "",
        longitude: "",
    })

    // Add state for DMS format
    const [dmsFormat, setDmsFormat] = useState({
        latitude: "",
        longitude: "",
    })

    // State to track input format
    const [useDecimalFormat, setUseDecimalFormat] = useState(true)

    // Form validation errors
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Fetch bus stops with React Query
    const {
        data: busStopsData,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["busStops", currentPage, pageSize, filters],
        queryFn: () =>
            getBusStops({
                ...filters,
                paginate: true,
                page: currentPage,
            }),
    })

    // Fetch single bus stop details
    const {
        data: busStopDetails,
        isLoading: isLoadingBusStopDetails,
        isError: isErrorBusStopDetails,
        refetch: refetchBusStopDetails,
    } = useQuery({
        queryKey: ["busStop", selectedBusStop?.id],
        queryFn: () => (selectedBusStop?.id ? getBusStop(selectedBusStop.id) : null),
        enabled: !!selectedBusStop?.id && isViewDialogOpen,
    })

    // Create bus stop mutation
    const createBusStopMutation = useMutation({
        mutationFn: (data: any) => createBusStop(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["busStops"] })
            toast({
                title: "Success",
                description: "Bus stop created successfully",
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error creating bus stop:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create bus stop. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Update bus stop mutation
    const updateBusStopMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateBusStop(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["busStops"] })
            toast({
                title: "Success",
                description: "Bus stop updated successfully",
            })
            setIsAddEditDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            console.error("Error updating bus stop:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to update bus stop. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Delete bus stop mutation
    const deleteBusStopMutation = useMutation({
        mutationFn: (id: number) => deleteBusStop(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["busStops"] })
            toast({
                title: "Success",
                description: "Bus stop deleted successfully",
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error: any) => {
            console.error("Error deleting bus stop:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete bus stop. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Extract bus stops and pagination data
    const busStops = busStopsData?.data?.data || []
    const pagination = {
        currentPage: busStopsData?.data?.current_page || 1,
        totalPages: busStopsData?.data?.last_page || 1,
        totalItems: busStopsData?.data?.total || 0,
        perPage: busStopsData?.data?.per_page || 10,
    }

    // Calculate stats
    const stats = {
        total: Array.isArray(busStops) ? busStops.length : 0,
        withCoordinates: Array.isArray(busStops)
            ? busStops.filter((stop) => stop && stop.latitude && stop.longitude).length
            : 0,
    }

    // Filter bus stops based on search query
    const filteredBusStops = Array.isArray(busStops)
        ? busStops.filter((busStop: BusStop) => {
            if (!busStop) return false

            // Filter by search query
            const name = (busStop.name || "").toLowerCase()
            const code = (busStop.code || "").toLowerCase()
            const query = searchQuery.toLowerCase()
            const matchesSearch = name.includes(query) || code.includes(query)

            return matchesSearch
        })
        : []

    // Validate form data
    const validateForm = () => {
        const errors: Record<string, string> = {}

        if (!formData.name.trim()) {
            errors.name = "Bus stop name is required"
        }

        if (!formData.code.trim()) {
            errors.code = "Bus stop code is required"
        }

        if (useDecimalFormat) {
            if (!formData.latitude || isNaN(Number(formData.latitude))) {
                errors.latitude = "Valid latitude is required"
            } else if (Number(formData.latitude) < -90 || Number(formData.latitude) > 90) {
                errors.latitude = "Latitude must be between -90 and 90"
            }

            if (!formData.longitude || isNaN(Number(formData.longitude))) {
                errors.longitude = "Valid longitude is required"
            } else if (Number(formData.longitude) < -180 || Number(formData.longitude) > 180) {
                errors.longitude = "Longitude must be between -180 and 180"
            }
        } else {
            if (!dmsFormat.latitude || dmsToDecimal(dmsFormat.latitude) === null) {
                errors.latitude = "Valid latitude in DMS format is required"
            }

            if (!dmsFormat.longitude || dmsToDecimal(dmsFormat.longitude) === null) {
                errors.longitude = "Valid longitude in DMS format is required"
            }
        }

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleCreateBusStop = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        createBusStopMutation.mutate({
            name: formData.name,
            code: formData.code,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
        })
    }

    const handleUpdateBusStop = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm() || !selectedBusStop) {
            return
        }

        updateBusStopMutation.mutate({
            id: selectedBusStop.id,
            data: {
                name: formData.name,
                code: formData.code,
                latitude: Number(formData.latitude),
                longitude: Number(formData.longitude),
            },
        })
    }

    const handleDeleteDialog = (busStop: BusStop) => {
        setSelectedBusStop(busStop)
        setIsDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = () => {
        if (selectedBusStop && selectedBusStop.id) {
            deleteBusStopMutation.mutate(selectedBusStop.id)
        }
    }

    const handleAddEdit = (busStop?: BusStop) => {
        // Reset form errors
        setFormErrors({})

        if (busStop) {
            setSelectedBusStop(busStop)
            setFormData({
                name: busStop.name || "",
                code: busStop.code || "",
                latitude: String(busStop.latitude || ""),
                longitude: String(busStop.longitude || ""),
            })
            setDmsFormat({
                latitude: busStop.latitude ? decimalToDMS(busStop.latitude, true) : "",
                longitude: busStop.longitude ? decimalToDMS(busStop.longitude, false) : "",
            })
        } else {
            setSelectedBusStop(null)
            setFormData({
                name: "",
                code: "",
                latitude: "",
                longitude: "",
            })
            setDmsFormat({
                latitude: "",
                longitude: "",
            })
        }
        setIsAddEditDialogOpen(true)
    }

    const handleViewBusStop = (busStop: BusStop) => {
        setSelectedBusStop(busStop)
        setIsViewDialogOpen(true)
    }

    const resetForm = () => {
        setFormData({
            name: "",
            code: "",
            latitude: "",
            longitude: "",
        })
        setSelectedBusStop(null)
        setFormErrors({})
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target

        // Clear the error for this field when user starts typing
        if (formErrors[id]) {
            setFormErrors({ ...formErrors, [id]: "" })
        }

        // If this is a coordinate field and we're using DMS format
        if ((id === "latitude-dms" || id === "longitude-dms") && !useDecimalFormat) {
            const coordType = id.split("-")[0] as "latitude" | "longitude"

            // Update the DMS format state
            setDmsFormat((prev) => ({
                ...prev,
                [coordType]: value,
            }))

            // Try to convert to decimal
            const decimal = dmsToDecimal(value)
            if (decimal !== null) {
                setFormData((prev) => ({
                    ...prev,
                    [coordType]: decimal.toString(),
                }))
            }
        } else {
            setFormData({
                ...formData,
                [id]: value,
            })

            // If decimal coordinates change, update DMS format
            if ((id === "latitude" || id === "longitude") && useDecimalFormat) {
                if (!isNaN(Number(value))) {
                    const dmsValue = decimalToDMS(Number(value), id === "latitude")
                    setDmsFormat((prev) => ({
                        ...prev,
                        [id]: dmsValue,
                    }))
                }
            }
        }
    }

    const handleSwitchChange = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, is_active: checked }))
    }

    const handleSearch = (term: string) => {
        setSearchQuery(term)
        setCurrentPage(1)
    }

    const handleFilterChange = (newFilters: any) => {
        setFilters((prev) => ({ ...prev, ...newFilters }))
        setCurrentPage(1)
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

    const filterOptions = [
        {
            id: "code",
            label: "Code",
            type: "text",
        },
    ]

    // Export to Excel function
    const exportToExcel = async () => {
        setIsExporting(true)
        try {
            // Create CSV content
            const headers = ["ID", "Name", "Code", "Latitude", "Longitude", "Status"]
            const csvContent = [
                headers.join(","),
                ...busStops.map((stop: BusStop) =>
                    [stop.id, stop.name, stop.code, stop.latitude, stop.longitude, stop.is_active ? "Active" : "Inactive"].join(
                        ",",
                    ),
                ),
            ].join("\n")

            // Create download link
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.setAttribute("href", url)
            link.setAttribute("download", `bus-stops-${new Date().toISOString().split("T")[0]}.csv`)
            link.style.visibility = "hidden"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast({
                title: "Success",
                description: "Bus stops exported to Excel successfully",
            })
        } catch (error) {
            console.error("Error exporting to Excel:", error)
            toast({
                title: "Error",
                description: "Failed to export bus stops to Excel",
                variant: "destructive",
            })
        } finally {
            setIsExporting(false)
        }
    }

    // Export to PDF function
    const exportToPDF = async () => {
        setIsExporting(true)
        try {
            // Create a simple HTML table for PDF content
            const tableHTML = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 20px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Bus Stops Report</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${busStops
                .map(
                    (stop: BusStop) => `
                  <tr>
                    <td>${stop.id}</td>
                    <td>${stop.name}</td>
                    <td>${stop.code}</td>
                    <td>${stop.latitude}</td>
                    <td>${stop.longitude}</td>
                    <td>${stop.is_active ? "Active" : "Inactive"}</td>
                  </tr>
                `,
                )
                .join("")}
              </tbody>
            </table>
            <div class="footer">
              <p>Total Bus Stops: ${busStops.length}</p>
            </div>
          </body>
        </html>
      `

            // Convert HTML to PDF using a print-to-PDF approach
            const printWindow = window.open("", "_blank")
            if (printWindow) {
                printWindow.document.write(tableHTML)
                printWindow.document.close()
                printWindow.focus()

                // Give time for styles to load
                setTimeout(() => {
                    printWindow.print()
                    printWindow.close()

                    toast({
                        title: "Success",
                        description: "Bus stops report generated. Check your downloads.",
                    })
                    setIsExporting(false)
                }, 1000)
            } else {
                throw new Error("Could not open print window")
            }
        } catch (error) {
            console.error("Error exporting to PDF:", error)
            toast({
                title: "Error",
                description: "Failed to export bus stops to PDF. Please check if pop-ups are allowed.",
                variant: "destructive",
            })
            setIsExporting(false)
        }
    }

    const toggleCoordinateFormat = () => {
        setUseDecimalFormat(!useDecimalFormat)
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto p-6 flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    // Error state
    if (isError) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Error loading bus stops. Please try again.</span>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Bus Stops Management"
                description="Manage all bus stops in the system"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsExporting(true)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                            {isExporting && <LoadingSpinner size="sm" className="ml-2" />}
                        </Button>
                        <Button size="sm" onClick={() => handleAddEdit()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bus Stop
                        </Button>
                    </div>
                }
                className="mb-6"
            />

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-6">
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

                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search bus stops..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsExporting(true)}
                                disabled={isExporting || busStops.length === 0}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    {!isMobile && <TableHead>Coordinates</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBusStops.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isMobile ? 5 : 6} className="h-24 text-center">
                                            No bus stops found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBusStops.map((busStop: BusStop) => (
                                        <TableRow key={busStop.id}>
                                            <TableCell>{busStop.id}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                                                    {busStop.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">{busStop.code}</TableCell>
                                            {!isMobile && (
                                                <TableCell className="font-mono text-xs">
                                                    {formatCoordinate(busStop.latitude)}, {formatCoordinate(busStop.longitude)}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleViewBusStop(busStop)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleAddEdit(busStop)}
                                                        title="Edit Bus Stop"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteDialog(busStop)}
                                                        title="Delete Bus Stop"
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
                                Showing {filteredBusStops.length} of {pagination.totalItems} bus stops
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
                </div>
            )}

            {/* View Bus Stop Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Bus Stop Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected bus stop.</DialogDescription>
                    </DialogHeader>
                    {isLoadingBusStopDetails ? (
                        <div className="py-6 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : selectedBusStop ? (
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

                                    {selectedBusStop.created_at && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Created At</h4>
                                            <p className="text-sm">{new Date(selectedBusStop.created_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                    {selectedBusStop.updated_at && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                                            <p className="text-sm">{new Date(selectedBusStop.updated_at).toLocaleString()}</p>
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
                    <DialogFooter className="gap-2">
                        {selectedBusStop && (
                            <Button variant="outline" onClick={() => handleAddEdit(selectedBusStop)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Bus Stop Dialog */}
            <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{selectedBusStop ? "Edit Bus Stop" : "Add New Bus Stop"}</DialogTitle>
                        <DialogDescription>
                            {selectedBusStop ? "Update the bus stop details below." : "Fill in the details to add a new bus stop."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={selectedBusStop ? handleUpdateBusStop : handleCreateBusStop}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Central Station"
                                        required
                                        className={formErrors.name ? "border-red-500" : ""}
                                    />
                                    {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">
                                        Code <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="code"
                                        value={formData.code}
                                        onChange={handleInputChange}
                                        placeholder="CTR-01"
                                        required
                                        className={formErrors.code ? "border-red-500" : ""}
                                    />
                                    {formErrors.code && <p className="text-sm text-red-500">{formErrors.code}</p>}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Coordinate Format</Label>
                                    <div className="flex items-center space-x-2">
                    <span className={`text-sm ${useDecimalFormat ? "font-medium" : "text-muted-foreground"}`}>
                      Decimal
                    </span>
                                        <Switch checked={!useDecimalFormat} onCheckedChange={toggleCoordinateFormat} />
                                        <span className={`text-sm ${!useDecimalFormat ? "font-medium" : "text-muted-foreground"}`}>
                      DMS
                    </span>
                                    </div>
                                </div>

                                {useDecimalFormat ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="latitude">
                                                Latitude <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="latitude"
                                                type="text"
                                                value={formData.latitude}
                                                onChange={handleInputChange}
                                                placeholder="e.g. -6.812345"
                                                required
                                                className={formErrors.latitude ? "border-red-500" : ""}
                                            />
                                            {formErrors.latitude && <p className="text-sm text-red-500">{formErrors.latitude}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="longitude">
                                                Longitude <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="longitude"
                                                type="text"
                                                value={formData.longitude}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 39.123456"
                                                required
                                                className={formErrors.longitude ? "border-red-500" : ""}
                                            />
                                            {formErrors.longitude && <p className="text-sm text-red-500">{formErrors.longitude}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="latitude-dms">
                                                    Latitude (DMS) <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    id="latitude-dms"
                                                    type="text"
                                                    value={dmsFormat.latitude}
                                                    onChange={handleInputChange}
                                                    placeholder="e.g. 6° 48' 44.4S"
                        required
                        className={formErrors.latitude ? "border-red-500" : ""}
                      />
                      {formErrors.latitude && <p className="text-sm text-red-500">{formErrors.latitude}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude-dms">
                        Longitude (DMS) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="longitude-dms"
                        type="text"
                        value={dmsFormat.longitude}
                        onChange={handleInputChange}
                        placeholder="e.g. 39° 7' 24.4E"
                                                required
                                                className={formErrors.longitude ? "border-red-500" : ""}
                                                />
                                                {formErrors.longitude && <p className="text-sm text-red-500">{formErrors.longitude}</p>}
                                            </div>
                                        </div>
                                    )
                                )}

                                <div className="text-sm text-muted-foreground">
                                    <p>
                                        {useDecimalFormat
                                            ? "Enter coordinates in decimal degrees (e.g., -6.812345, 39.123456)"
                                            : "Enter coordinates in degrees, minutes, seconds (e.g., 6° 48' 44.4\" S, 39° 7' 24.4\" E)"}
                                    </p>
                                    {!useDecimalFormat && formData.latitude && formData.longitude && (
                                        <p className="mt-1">
                                            Decimal values: {formData.latitude}, {formData.longitude}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {formData.latitude &&
                                formData.longitude &&
                                !isNaN(Number(formData.latitude)) &&
                                !isNaN(Number(formData.longitude)) && (
                                    <div className="mt-4">
                                        <Label className="mb-2 block">Preview Location</Label>
                                        <div className="h-[200px] w-full relative rounded-md overflow-hidden border">
                                            <iframe
                                                title="Location Preview"
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                scrolling="no"
                                                marginHeight={0}
                                                marginWidth={0}
                                                src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&z=15&output=embed`}
                                            ></iframe>
                                        </div>
                                    </div>
                                )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddEditDialogOpen(false)}
                                disabled={createBusStopMutation.isPending || updateBusStopMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createBusStopMutation.isPending || updateBusStopMutation.isPending}>
                                {createBusStopMutation.isPending || updateBusStopMutation.isPending ? (
                                    <>
                                        <LoadingSpinner className="mr-2" size="sm" />
                                        {selectedBusStop ? "Updating..." : "Creating..."}
                                    </>
                                ) : selectedBusStop ? (
                                    "Update Bus Stop"
                                ) : (
                                    "Create Bus Stop"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <div className="flex flex-col items-center justify-center py-6">
                        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                        <h3 className="text-lg font-medium text-center">Are you sure?</h3>
                        <p className="text-sm text-center text-muted-foreground">
                            This will permanently delete the bus stop "{selectedBusStop?.name}". This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={deleteBusStopMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteBusStopMutation.isPending}>
                            {deleteBusStopMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
