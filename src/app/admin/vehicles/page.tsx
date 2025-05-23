"use client"

import React from "react"

import type { Vehicle } from "@/types/vehicle"

import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { getVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle } from "@/lib/services/vehicle"
import { getCompanies } from "@/lib/services/company"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Truck,
  Building2,
  User,
  Smartphone,
  Filter,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Company {
  id: number
  name: string
  phone_number?: string
  email?: string
  is_active?: boolean
}

export default function VehiclesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State for search, filters, and pagination
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [companyFilter, setCompanyFilter] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // State for dialogs
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    registration_number: "",
    company_id: 0,
    is_active: true,
  })

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch companies with React Query
  const {
    data: companiesData,
    isLoading: isLoadingCompanies,
    isError: isErrorCompanies,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies({ paginate: true, name: "", is_active: true }),
  })

  // Extract companies from the response
  const companies = companiesData?.data?.data || []

  // Fetch vehicles with React Query
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    isError: isErrorVehicles,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles", currentPage, pageSize, statusFilter, companyFilter],
    queryFn: async () => {
      const response = await getVehicles({
        paginate: true,
        page: currentPage,
        per_page: pageSize,
        status: statusFilter.length === 1 ? (statusFilter[0] === "active" ? "active" : "inactive") : undefined,
        company_id: companyFilter,
      })
      console.log("Vehicles API Response:", response) // Debug log
      return response
    },
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

  // Create vehicle mutation
  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      refetchVehicles()
      toast({
        title: "Vehicle created",
        description: "The vehicle has been created successfully.",
      })
      setIsAddEditDialogOpen(false)
    },
    onError: (error: any) => {
      console.error("Error creating vehicle:", error)
      toast({
        title: "Error Creating Vehicle",
        description: error.message || "There was a problem creating the vehicle. Please try again.",
        variant: "destructive",
      })
      // Keep the dialog open so the user can correct the error
    },
  })

  // Update vehicle mutation
  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      refetchVehicles()
      toast({
        title: "Vehicle updated",
        description: "The vehicle has been updated successfully.",
      })
      setIsAddEditDialogOpen(false)
    },
    onError: (error: any) => {
      console.error("Error updating vehicle:", error)
      toast({
        title: "Error Updating Vehicle",
        description: error.message || "There was a problem updating the vehicle. Please try again.",
        variant: "destructive",
      })
      // Keep the dialog open so the user can correct the error
    },
  })

  // Delete vehicle mutation
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      refetchVehicles()
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been deleted successfully.",
      })
      setIsDeleteDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete vehicle: ${error.message}`,
        variant: "destructive",
      })
    },
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
      const query = searchQuery.toLowerCase()
      const matchesSearch = name.includes(query) || regNumber.includes(query) || model.includes(query)

      // Filter by status
      const matchesStatus =
          statusFilter.length === 0 ||
          (statusFilter.includes("active") && vehicle.is_active) ||
          (statusFilter.includes("inactive") && !vehicle.is_active)

      // Filter by company
      const matchesCompany = companyFilter === null || vehicle.company_id === companyFilter

      return matchesSearch && matchesStatus && matchesCompany
    })
  }, [vehicles, searchQuery, statusFilter, companyFilter])

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = "Vehicle name is required"
    }

    if (!formData.registration_number.trim()) {
      errors.registration_number = "Registration number is required"
    }

    if (!formData.company_id) {
      errors.company_id = "Company is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle opening the add/edit dialog
  const handleAddEdit = (vehicle?: Vehicle) => {
    // Reset form errors
    setFormErrors({})

    if (vehicle) {
      setSelectedVehicle(vehicle)
      setFormData({
        name: vehicle.name || "",
        registration_number: vehicle.registration_number || "",
        company_id: vehicle.company_id || (companies.length > 0 ? companies[0].id : 0),
        is_active: vehicle.is_active !== undefined ? vehicle.is_active : true,
      })
    } else {
      setSelectedVehicle(null)
      setFormData({
        name: "",
        registration_number: "",
        company_id: companies.length > 0 ? companies[0].id : 0,
        is_active: true,
      })
    }
    setIsAddEditDialogOpen(true)
  }

  // Handle opening the view dialog
  const handleViewVehicle = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle)
    setIsViewDialogOpen(true)
  }

  // Handle opening the delete dialog
  const handleDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsDeleteDialogOpen(true)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target

    // Clear the error for this field when user starts typing
    if (formErrors[id]) {
      setFormErrors({ ...formErrors, [id]: "" })
    }

    // Update form data immediately
    setFormData({
      ...formData,
      [id]: type === "number" ? Number(value) : value,
    })

    // Optional: Add real-time validation
    validateField(id, type === "number" ? Number(value) : value)
  }

  const handleSelectChange = (id: string, value: string) => {
    // Clear the error for this field when user makes a selection
    if (formErrors[id]) {
      setFormErrors({ ...formErrors, [id]: "" })
    }

    let processedValue: any = value

    // Process the value based on field type
    if (id === "is_active") {
      processedValue = value === "true"
    } else if (id === "company_id") {
      processedValue = Number(value)
    }

    // Update form data immediately
    setFormData({
      ...formData,
      [id]: processedValue,
    })

    // Optional: Add real-time validation
    validateField(id, processedValue)
  }

  // Add a new function for field-level validation
  const validateField = (id: string, value: any) => {
    let error = ""

    switch (id) {
      case "name":
        if (!value || (typeof value === "string" && !value.trim())) {
          error = "Vehicle name is required"
        }
        break
      case "registration_number":
        if (!value || (typeof value === "string" && !value.trim())) {
          error = "Registration number is required"
        }
        break
      case "company_id":
        if (!value || value === 0) {
          error = "Company is required"
        }
        break
    }

    if (error) {
      setFormErrors((prev) => ({ ...prev, [id]: error }))
      return false
    } else {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
      return true
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form before submitting.",
        variant: "destructive",
      })
      return
    }

    // Prepare data for API
    const apiData = {
      name: formData.name,
      registration_number: formData.registration_number,
      company_id: formData.company_id,
      is_active: formData.is_active,
    }

    try {
      if (selectedVehicle && selectedVehicle.id) {
        updateVehicleMutation.mutate({ id: selectedVehicle.id, data: apiData })
      } else {
        createVehicleMutation.mutate(apiData)
      }
    } catch (error: any) {
      toast({
        title: selectedVehicle ? "Error Updating Vehicle" : "Error Creating Vehicle",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedVehicle && selectedVehicle.id) {
      deleteVehicleMutation.mutate(selectedVehicle.id)
    }
  }

  // Get company name by ID
  const getCompanyName = (companyId: number) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) return company.name

    const vehicle = vehicles.find((v) => v.company_id === companyId)
    return vehicle && vehicle.company ? vehicle.company.name : `Company ${companyId}`
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

  // Set company filter
  const handleCompanyFilter = (companyId: string) => {
    setCompanyFilter(companyId === "all" ? null : Number(companyId))
    setCurrentPage(1)
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
            title="Vehicles Management"
            description="Manage all vehicles in the system"
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchVehicles()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={() => handleAddEdit()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>
            }
            className="mb-6"
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All vehicles</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-red-500" />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Company: {companyFilter ? getCompanyName(companyFilter) : "All"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                <DropdownMenuCheckboxItem
                    checked={companyFilter === null}
                    onCheckedChange={() => handleCompanyFilter("all")}
                >
                  All Companies
                </DropdownMenuCheckboxItem>
                {isLoadingCompanies ? (
                    <div className="flex items-center justify-center py-2">
                      <LoadingSpinner size="sm" className="mr-2" />
                      <span>Loading companies...</span>
                    </div>
                ) : (
                    companies.map((company) => (
                        <DropdownMenuCheckboxItem
                            key={company.id}
                            checked={companyFilter === company.id}
                            onCheckedChange={() => handleCompanyFilter(company.id.toString())}
                        >
                          {company.name}
                        </DropdownMenuCheckboxItem>
                    ))
                )}
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
                <TableHead>Registration</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No vehicles found.
                    </TableCell>
                  </TableRow>
              ) : (
                  filteredVehicles.map((vehicle: Vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-2 text-blue-600" />
                            {vehicle.name || vehicle.model || "Unknown Vehicle"}
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.registration_number || vehicle.license_plate || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2" />
                            {vehicle.company ? vehicle.company.name : getCompanyName(vehicle.company_id)}
                          </div>
                        </TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => handleAddEdit(vehicle)} title="Edit Vehicle">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDialog(vehicle)}
                                title="Delete Vehicle"
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
                    <h3 className="text-lg font-medium">{viewingVehicle.name}</h3>
                    <div className="text-sm text-muted-foreground">{viewingVehicle.registration_number}</div>
                  </div>

                  <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Company</h4>
                          <p className="text-sm">
                            {viewingVehicle.company
                                ? viewingVehicle.company.name
                                : getCompanyName(viewingVehicle.company_id)}
                          </p>
                        </div>
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">ID</h4>
                          <p className="text-sm">{viewingVehicle.id}</p>
                        </div>
                        {viewingVehicle.created_at && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Created At</h4>
                              <p className="text-sm">{new Date(viewingVehicle.created_at).toLocaleString()}</p>
                            </div>
                        )}
                      </div>

                      {viewingVehicle.updated_at && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                            <p className="text-sm">{new Date(viewingVehicle.updated_at).toLocaleString()}</p>
                          </div>
                      )}
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
              {viewingVehicle && (
                  <Button variant="outline" onClick={() => handleAddEdit(viewingVehicle)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
              )}
              <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Vehicle Dialog */}
        <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
              <DialogDescription>
                {selectedVehicle ? "Update the vehicle details below." : "Fill in the details to add a new vehicle."}
              </DialogDescription>
            </DialogHeader>
            {(createVehicleMutation.isError || updateVehicleMutation.isError) && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">{selectedVehicle ? "Error updating vehicle" : "Error creating vehicle"}</p>
                      <p className="text-sm">
                        {createVehicleMutation.error?.message ||
                            updateVehicleMutation.error?.message ||
                            "There was a problem with your request. Please try again."}
                      </p>
                    </div>
                  </div>
                </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Vehicle Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Marcopolo G7 - Mzani"
                        required
                        className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_number">
                      Registration Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="registration_number"
                        value={formData.registration_number}
                        onChange={handleInputChange}
                        placeholder="T 123 ABC"
                        required
                        className={formErrors.registration_number ? "border-red-500" : ""}
                    />
                    {formErrors.registration_number && (
                        <p className="text-sm text-red-500">{formErrors.registration_number}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_id">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <Select
                      value={String(formData.company_id)}
                      onValueChange={(value) => {
                        const companyId = Number(value)
                        setFormData({ ...formData, company_id: companyId })

                        // Clear any errors for this field
                        if (formErrors.company_id) {
                          setFormErrors({ ...formErrors, company_id: "" })
                        }

                        // Optional: Validate the field
                        if (!companyId) {
                          setFormErrors((prev) => ({ ...prev, company_id: "Company is required" }))
                        }
                      }}
                  >
                    <SelectTrigger className={formErrors.company_id ? "border-red-500" : ""}>
                      <SelectValue placeholder={isLoadingCompanies ? "Loading companies..." : "Select company"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCompanies ? (
                          <div className="flex items-center justify-center py-2">
                            <LoadingSpinner size="sm" className="mr-2" />
                            <span>Loading companies...</span>
                          </div>
                      ) : isErrorCompanies ? (
                          <div className="text-center py-2 text-red-500">Failed to load companies</div>
                      ) : companies.length === 0 ? (
                          <SelectItem value="0" disabled>
                            No companies available
                          </SelectItem>
                      ) : (
                          companies.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.company_id && <p className="text-sm text-red-500">{formErrors.company_id}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Active Status</Label>
                    <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, is_active: checked })
                          // Clear any errors for this field
                          if (formErrors.is_active) {
                            setFormErrors({ ...formErrors, is_active: "" })
                          }
                        }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_active ? "Vehicle is active and available" : "Vehicle is inactive and unavailable"}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddEditDialogOpen(false)}
                    disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}>
                  {createVehicleMutation.isPending || updateVehicleMutation.isPending ? (
                      <>
                        <LoadingSpinner className="mr-2" size="sm" />
                        {selectedVehicle ? "Updating..." : "Creating..."}
                      </>
                  ) : selectedVehicle ? (
                      "Update Vehicle"
                  ) : (
                      "Create Vehicle"
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
                This will permanently delete the vehicle "{selectedVehicle?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteVehicleMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={deleteVehicleMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
              >
                {deleteVehicleMutation.isPending ? (
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
