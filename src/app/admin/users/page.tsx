"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PlusCircle,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserCog,
  Users,
  Truck,
  Headphones,
  Check,
  X,
  RefreshCw,
} from "lucide-react"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserForm } from "@/components/forms/user-form"
import { PageHeader } from "@/components/page-header"

export default function UsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Get current page from URL or default to 1
  const page = searchParams.get("page") ? Number.parseInt(searchParams.get("page") as string, 10) : 1
  const perPage = searchParams.get("per_page") ? Number.parseInt(searchParams.get("per_page") as string, 10) : 10
  const searchQuery = searchParams.get("search") || ""

  // State for users data
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
    from: 0,
    to: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // State for user actions
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false)

  // State for add/edit user modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<any>(null)
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  // Add these new state variables after the existing state declarations (around line 60)
  const [createdUserOtp, setCreatedUserOtp] = useState<string | null>(null)
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false)
  const [createdUserInfo, setCreatedUserInfo] = useState<any>(null)

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        paginate: "true",
        page: page.toString(),
        per_page: perPage.toString(),
      })

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      console.log(`Fetching users with params: ${params.toString()}`)
      const response = await fetch(`/api/proxy/users?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized
          router.push("/")
          throw new Error("Unauthorized")
        }
        throw new Error(`Failed to fetch users: ${response.status}`)
      }

      const data = await response.json()
      console.log("Users data:", data)

      // Extract users from the response
      const fetchedUsers = data?.data?.data || []
      setUsers(fetchedUsers)

      // Set pagination data
      setPagination({
        currentPage: data?.data?.current_page || 1,
        lastPage: data?.data?.last_page || 1,
        perPage: data?.data?.per_page || 10,
        total: data?.data?.total || 0,
        from: data?.data?.from || 0,
        to: data?.data?.to || 0,
      })
    } catch (err) {
      console.error("Error fetching users:", err)
      setError(err instanceof Error ? err : new Error("Failed to fetch users"))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch companies (needed for user form)
  const fetchCompanies = async () => {
    setIsLoadingCompanies(true)
    try {
      const response = await fetch("/api/proxy/companies")

      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }

      const data = await response.json()
      setCompanies(data.data || [])
    } catch (err) {
      console.error("Error fetching companies:", err)
      toast({
        title: "Error",
        description: "Failed to load companies. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCompanies(false)
    }
  }

  // Fetch user details
  const fetchUserDetails = async (userId: number) => {
    setIsLoadingUserDetails(true)
    try {
      const response = await fetch(`/api/proxy/users/${userId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch user details")
      }

      const data = await response.json()
      setUserDetails(data.data)
      return data.data
    } catch (err) {
      console.error("Error fetching user details:", err)
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoadingUserDetails(false)
    }
  }

  // Replace the existing createUser function (around line 180)
  const createUser = async (userData: any) => {
    try {
      const response = await fetch("/api/proxy/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create user")
      }

      const result = await response.json()

      // Extract OTP and user info from response
      if (result.data && result.data.otp) {
        setCreatedUserOtp(result.data.otp)
        setCreatedUserInfo({
          name: `${result.data.first_name} ${result.data.last_name}`,
          email: result.data.email,
          type: result.data.type,
          float_account: result.data.float_account,
        })
        setIsOtpDialogOpen(true)
      }

      toast({
        title: "Success",
        description: "User created successfully",
      })

      // Close modal and refresh users
      setIsAddUserModalOpen(false)
      fetchUsers()

      return true
    } catch (err) {
      console.error("Error creating user:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create user",
        variant: "destructive",
      })
      return false
    }
  }

  // Update user
  const updateUser = async (userId: number, userData: any) => {
    try {
      const response = await fetch(`/api/proxy/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update user")
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      // Close modal and refresh users
      setIsEditUserModalOpen(false)
      fetchUsers()

      return true
    } catch (err) {
      console.error("Error updating user:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      })
      return false
    }
  }

  // Delete user
  const deleteUser = async (userId: number) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/proxy/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      // Refresh users list
      fetchUsers()
    } catch (err) {
      console.error("Error deleting user:", err)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // Fetch users on mount and when dependencies change
  useEffect(() => {
    fetchUsers()
  }, [page, perPage, searchQuery])

  // Fetch companies when needed for forms
  useEffect(() => {
    if (isAddUserModalOpen || isEditUserModalOpen) {
      fetchCompanies()
    }
  }, [isAddUserModalOpen, isEditUserModalOpen])

  // Handle search
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const search = formData.get("search") as string

    // Update URL with search parameter
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }
    params.set("page", "1") // Reset to first page on new search
    router.push(`/admin/users?${params.toString()}`)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/admin/users?${params.toString()}`)
  }

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchUsers()
  }

  // View user details
  const handleViewUser = (user: any) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
    fetchUserDetails(user.id)
  }

  // Add user
  const handleAddUser = () => {
    setIsAddUserModalOpen(true)
  }

  // Edit user
  const handleEditUser = async (userId: number) => {
    const userData = await fetchUserDetails(userId)
    if (userData) {
      setUserToEdit(userData)
      setIsEditUserModalOpen(true)
    }
  }

  // Delete user
  const handleDeleteUser = (user: any) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete user
  const confirmDeleteUser = () => {
    if (userToDelete?.id) {
      deleteUser(userToDelete.id)
    }
  }

  // Manage user roles
  const handleManageRoles = (userId: number) => {
    router.push(`/admin/users/roles/${userId}`)
  }

  // Handle form submission for creating a user
  const handleCreateUserSubmit = async (data: any) => {
    return await createUser(data)
  }

  // Handle form submission for updating a user
  const handleUpdateUserSubmit = async (data: any) => {
    if (userToEdit?.id) {
      return await updateUser(userToEdit.id, data)
    }
    return false
  }

  // Calculate stats
  const stats = {
    total: pagination.total || 0,
    active: users.filter((user) => user.is_active).length || 0,
    admins: users.filter((user) => user.type === "Admin").length || 0,
    agents: users.filter((user) => user.type === "Agent").length || 0,
    drivers: users.filter((user) => user.type === "Driver").length || 0,
    conductors: users.filter((user) => user.type === "Conductor").length || 0,
  }

  function getInitials(firstName?: string, lastName?: string) {
    const first = firstName && firstName.length > 0 ? firstName.charAt(0) : ""
    const last = lastName && lastName.length > 0 ? lastName.charAt(0) : ""
    return `${first}${last}`.toUpperCase()
  }

  function getUserTypeIcon(type?: string) {
    switch (type) {
      case "Admin":
        return <UserCog className="h-4 w-4 text-primary" />
      case "Agent":
        return <Users className="h-4 w-4 text-indigo-500" />
      case "Driver":
        return <Truck className="h-4 w-4 text-green-500" />
      case "Conductor":
        return <Headphones className="h-4 w-4 text-amber-500" />
      default:
        return <UserCog className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (isLoading && !isRefreshing) {
    return (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
    )
  }

  if (error && !users.length) {
    return (
        <div className="space-y-4 p-6">
          <PageHeader title="Users" description="Manage system users and their permissions" />
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Users</h2>
            <p className="text-muted-foreground">
              {error.message || "There was a problem loading the user data. Please try refreshing the page."}
            </p>
            <Button className="mt-4" onClick={() => fetchUsers()}>
              Retry
            </Button>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6 p-6">
        <PageHeader
            title="Users"
            description="Manage system users and their permissions"
            actions={
              <>
                <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button onClick={handleAddUser}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </>
            }
        />

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">System admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.agents}</div>
              <p className="text-xs text-muted-foreground">Sales agents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.drivers}</div>
              <p className="text-xs text-muted-foreground">Vehicle operators</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conductors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conductors}</div>
              <p className="text-xs text-muted-foreground">Bus conductors</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <form onSubmit={handleSearch}>
              <Input
                  type="search"
                  placeholder="Search users..."
                  name="search"
                  defaultValue={searchQuery}
                  className="pl-8"
              />
            </form>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
              ) : (
                  users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                  src={`/avatars/${user.id}.png`}
                                  alt={`${user.first_name || ""} ${user.last_name || ""}`}
                              />
                              <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{`${user.first_name || ""} ${user.last_name || ""}`}</div>
                              <div className="text-sm text-muted-foreground">{user.email || ""}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getUserTypeIcon(user.type)}
                            <span>{user.type || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.is_active ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <X className="h-4 w-4 text-red-500" />
                            )}
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    user.is_active
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                }`}
                            >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageRoles(user.id)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Showing {pagination.from} to {pagination.to} of {pagination.total} users
          </div>
          <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1 || isLoading}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {pagination.currentPage} of {pagination.lastPage}
            </div>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.lastPage || isLoading}
            >
              Next
            </Button>
          </div>
        </div>

        {/* View User Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>Detailed information about the selected user.</DialogDescription>
            </DialogHeader>
            {isLoadingUserDetails ? (
                <div className="py-6 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
            ) : userDetails ? (
                <div className="py-4">
                  <div className="flex flex-col items-center mb-6">
                    <Avatar className="h-20 w-20 mb-4">
                      <AvatarImage
                          src={`/avatars/${userDetails.id}.png`}
                          alt={`${userDetails.first_name} ${userDetails.last_name}`}
                      />
                      <AvatarFallback className="text-lg">
                        {getInitials(userDetails.first_name, userDetails.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-medium">{`${userDetails.first_name} ${userDetails.last_name}`}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getUserTypeIcon(userDetails.type)}
                      <span>{userDetails.type}</span>
                    </div>
                  </div>

                  <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Email</h4>
                          <p className="text-sm">{userDetails.email}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Phone</h4>
                          <p className="text-sm">{userDetails.phone_number || "—"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Company</h4>
                          <p className="text-sm">{userDetails.company?.name || "Not Assigned"}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">ID Number</h4>
                          <p className="text-sm">{userDetails.id_number || "—"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Status</h4>
                          <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  userDetails.is_active
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              }`}
                          >
                        {userDetails.is_active ? "Active" : "Inactive"}
                      </span>
                        </div>
                        {(userDetails.type === "Conductor" || userDetails.type === "Driver") && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Float</h4>
                              <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      userDetails.use_float
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                  }`}
                              >
                          {userDetails.use_float ? "Enabled" : "Disabled"}
                        </span>
                            </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-1">Created At</h4>
                        <p className="text-sm">{new Date(userDetails.created_at).toLocaleString()}</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="roles" className="space-y-4 mt-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Assigned Roles</h3>
                        {userDetails.id && (
                            <Button size="sm" onClick={() => handleManageRoles(userDetails.id)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Manage Roles
                            </Button>
                        )}
                      </div>

                      {userDetails.roles && userDetails.roles.length > 0 ? (
                          <div className="space-y-4">
                            {userDetails.roles.map((role: any) => (
                                <div key={role.id} className="border rounded-lg p-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium">{role.name}</h4>
                                  </div>
                                  <div className="mt-2">
                                    <h5 className="text-sm font-medium mb-1">Permissions:</h5>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {role.permissions && role.permissions.length > 0 ? (
                                          role.permissions.map((permission: any) => (
                                              <Badge key={permission.id} variant="secondary" className="text-xs">
                                                {permission.name}
                                              </Badge>
                                          ))
                                      ) : (
                                          <p className="text-sm text-muted-foreground">No permissions assigned</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                            ))}
                          </div>
                      ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>No roles assigned to this user</p>
                          </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
            ) : (
                <div className="py-6 text-center text-muted-foreground">No user data available</div>
            )}
            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                {selectedUser && (
                    <Button
                        variant="destructive"
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleDeleteUser(selectedUser)
                        }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => {
                      setIsViewDialogOpen(false)
                    }}
                >
                  Close
                </Button>
                {selectedUser && (
                    <Button
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleEditUser(selectedUser.id)
                        }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Modal */}
        <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user in the system.</DialogDescription>
            </DialogHeader>

            {isLoadingCompanies ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner />
                </div>
            ) : (
                <UserForm onSubmit={handleCreateUserSubmit} companies={companies} userType="system" isEditMode={false} />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information.</DialogDescription>
            </DialogHeader>

            {isLoadingCompanies || !userToEdit ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner />
                </div>
            ) : (
                <UserForm
                    initialData={userToEdit}
                    onSubmit={handleUpdateUserSubmit}
                    companies={companies}
                    userType="system"
                    isEditMode={true}
                />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user
                {userToDelete && ` ${userToDelete.first_name} ${userToDelete.last_name}`} and all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={confirmDeleteUser}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
              >
                {isDeleting ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Deleting...
                    </>
                ) : (
                    "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* OTP Display Dialog */}
        <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                User Created Successfully
              </DialogTitle>
              <DialogDescription>
                The user has been created and assigned the following OTP for initial login.
              </DialogDescription>
            </DialogHeader>

            {createdUserInfo && (
                <div className="space-y-4 py-4">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">User Details</h4>
                      <p className="font-medium">{createdUserInfo.name}</p>
                      <p className="text-sm text-muted-foreground">{createdUserInfo.email}</p>
                      <p className="text-sm text-muted-foreground">Type: {createdUserInfo.type}</p>
                      {createdUserInfo.float_account && (
                          <p className="text-sm text-muted-foreground">Float Account: {createdUserInfo.float_account}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-primary mb-2">One-Time Password (OTP)</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-background border rounded px-3 py-2 text-lg font-mono font-bold tracking-wider">
                        {createdUserOtp}
                      </code>
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(createdUserOtp || "")
                            toast({
                              title: "Copied!",
                              description: "OTP copied to clipboard",
                            })
                          }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this OTP with the user for their initial login. They will be required to change their password
                      after first login.
                    </p>
                  </div>
                </div>
            )}

            <DialogFooter>
              <Button
                  onClick={() => {
                    setIsOtpDialogOpen(false)
                    setCreatedUserOtp(null)
                    setCreatedUserInfo(null)
                  }}
                  className="w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
