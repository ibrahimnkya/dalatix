"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, Edit, Trash2, Shield, Key, RefreshCcw, AlertCircle } from "lucide-react"
import type { Role } from "@/types/role"
import type { Permission } from "@/types/permission"
import { getRoles, getRole, createRole, updateRole, deleteRole, assignPermissionsToRole } from "@/lib/services/role"
import { getPermissionsByParent, getPermissions } from "@/lib/services/permission"

export default function RolesPage() {
    const { toast } = useToast()
    const [roles, setRoles] = useState<Role[]>([])
    const [permissionsByParent, setPermissionsByParent] = useState<Record<string, Permission[]>>({})
    const [isLoadingRoles, setIsLoadingRoles] = useState(true)
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
    const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
    const [roleName, setRoleName] = useState("")
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [stats, setStats] = useState({
        totalRoles: 0,
        totalPermissions: 0,
        permissionCategories: 0,
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        fetchRoles()
        fetchPermissions()
    }, [])

    async function fetchRoles() {
        setIsLoadingRoles(true)
        try {
            const response = await getRoles({ paginate: false })
            console.log("Roles API Response:", response)

            let rolesData: Role[] = []

            // Handle different response structures
            if (response.data && Array.isArray(response.data.data)) {
                rolesData = response.data.data
            } else if (Array.isArray(response.data)) {
                rolesData = response.data
            } else if (response.data && typeof response.data === "object") {
                rolesData = [response.data]
            }

            console.log("Processed roles data:", rolesData)

            // Fetch detailed role information including permissions for each role
            const detailedRoles = await Promise.all(
                rolesData.map(async (role) => {
                    try {
                        const roleDetails = await getRole(role.id)
                        console.log(`Role ${role.id} details:`, roleDetails)
                        return roleDetails.data || role
                    } catch (error) {
                        console.error(`Error fetching details for role ${role.id}:`, error)
                        return role // Return the basic role if details fetch fails
                    }
                }),
            )

            console.log("Final detailed roles:", detailedRoles)
            setRoles(detailedRoles)
            setStats((prev) => ({ ...prev, totalRoles: detailedRoles.length }))
        } catch (error) {
            console.error("Error fetching roles:", error)
            toast({
                title: "Error",
                description: "Failed to fetch roles. Please try again.",
                variant: "destructive",
            })
            setRoles([])
        } finally {
            setIsLoadingRoles(false)
        }
    }

    async function fetchPermissions() {
        setIsLoadingPermissions(true)
        try {
            console.log("=== Starting fetchPermissions ===")

            // Try both methods to get permissions
            let groupedPermissions: Record<string, Permission[]> = {}

            try {
                // First try the grouped method
                console.log("Attempting getPermissionsByParent()...")
                const groupedResponse = await getPermissionsByParent()
                console.log("getPermissionsByParent() raw response:", groupedResponse)
                console.log("getPermissionsByParent() response type:", typeof groupedResponse)
                console.log("getPermissionsByParent() is array:", Array.isArray(groupedResponse))

                if (groupedResponse && typeof groupedResponse === "object") {
                    const keys = Object.keys(groupedResponse)
                    console.log("getPermissionsByParent() keys:", keys)
                    console.log("getPermissionsByParent() values:", Object.values(groupedResponse))

                    // Check if we have meaningful keys or just numeric indices
                    const hasNumericKeys = keys.every((key) => !isNaN(Number(key)))
                    console.log("Has numeric keys:", hasNumericKeys)

                    if (!hasNumericKeys && keys.length > 0) {
                        // We have proper parent names as keys
                        console.log("Using grouped response as-is")
                        groupedPermissions = groupedResponse
                    } else if (keys.length > 0) {
                        // We need to regroup manually
                        console.log("Regrouping from numeric keys...")
                        const allPermissions = Object.values(groupedResponse).flat()
                        console.log("All permissions from grouped response:", allPermissions)

                        allPermissions.forEach((permission) => {
                            if (permission && typeof permission === "object" && permission.name) {
                                const parent = permission.parent || "Other"
                                if (!groupedPermissions[parent]) {
                                    groupedPermissions[parent] = []
                                }
                                groupedPermissions[parent].push(permission)
                            }
                        })
                        console.log("Regrouped permissions:", groupedPermissions)
                    } else {
                        console.log("Empty response from getPermissionsByParent")
                    }
                } else {
                    console.log("Invalid response from getPermissionsByParent:", groupedResponse)
                }
            } catch (groupedError) {
                console.error("getPermissionsByParent() failed:", groupedError)
            }

            // If grouped method didn't work or returned empty, try regular permissions
            if (Object.keys(groupedPermissions).length === 0) {
                try {
                    console.log("Attempting getPermissions() as fallback...")
                    const regularResponse = await getPermissions()
                    console.log("getPermissions() raw response:", regularResponse)
                    console.log("getPermissions() response type:", typeof regularResponse)

                    let allPermissions: Permission[] = []

                    if (regularResponse && regularResponse.data && Array.isArray(regularResponse.data)) {
                        console.log("Using regularResponse.data")
                        allPermissions = regularResponse.data
                    } else if (Array.isArray(regularResponse)) {
                        console.log("Using regularResponse directly")
                        allPermissions = regularResponse
                    } else if (regularResponse && typeof regularResponse === "object") {
                        console.log("Trying to extract from object response...")
                        // Try different possible structures
                        if (regularResponse.permissions && Array.isArray(regularResponse.permissions)) {
                            allPermissions = regularResponse.permissions
                        } else if (regularResponse.result && Array.isArray(regularResponse.result)) {
                            allPermissions = regularResponse.result
                        }
                    }

                    console.log("Extracted permissions array:", allPermissions)
                    console.log("Permissions array length:", allPermissions.length)

                    // Group by parent
                    if (allPermissions.length > 0) {
                        console.log("Grouping permissions by parent...")
                        allPermissions.forEach((permission, index) => {
                            console.log(`Permission ${index}:`, permission)
                            if (permission && typeof permission === "object" && permission.name) {
                                const parent = permission.parent || "Other"
                                if (!groupedPermissions[parent]) {
                                    groupedPermissions[parent] = []
                                }
                                groupedPermissions[parent].push(permission)
                            } else {
                                console.warn("Invalid permission object:", permission)
                            }
                        })
                    }
                } catch (regularError) {
                    console.error("getPermissions() also failed:", regularError)
                }
            }

            console.log("=== Final grouped permissions ===", groupedPermissions)
            console.log("Final grouped permissions keys:", Object.keys(groupedPermissions))
            console.log("Final grouped permissions entries:", Object.entries(groupedPermissions))

            setPermissionsByParent(groupedPermissions)

            // Calculate stats
            let totalPermissions = 0
            Object.values(groupedPermissions).forEach((permissions) => {
                totalPermissions += permissions.length
            })

            console.log("=== Permission stats ===", {
                totalPermissions,
                categories: Object.keys(groupedPermissions).length,
                categoryNames: Object.keys(groupedPermissions),
            })

            setStats((prev) => ({
                ...prev,
                totalPermissions,
                permissionCategories: Object.keys(groupedPermissions).length,
            }))

            console.log("=== fetchPermissions completed ===")
        } catch (error) {
            console.error("=== fetchPermissions error ===", error)
            toast({
                title: "Error",
                description: "Failed to fetch permissions. Please try again.",
                variant: "destructive",
            })
            setPermissionsByParent({})
        } finally {
            setIsLoadingPermissions(false)
        }
    }

    function validateRoleName(name: string): string | null {
        if (!name.trim()) {
            return "Role name is required"
        }
        if (name.trim().length < 2) {
            return "Role name must be at least 2 characters long"
        }
        if (name.trim().length > 50) {
            return "Role name must be less than 50 characters"
        }
        // Check for duplicate names (excluding current role when editing)
        const existingRole = roles.find(
            (role) => role.name.toLowerCase() === name.trim().toLowerCase() && role.id !== selectedRole?.id,
        )
        if (existingRole) {
            return "A role with this name already exists"
        }
        return null
    }

    async function handleCreateRole() {
        const nameError = validateRoleName(roleName)
        if (nameError) {
            setErrors({ name: nameError })
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const response = await createRole({ name: roleName.trim() })

            // Fetch the detailed role information including permissions
            let newRole = response.data
            try {
                const roleDetails = await getRole(response.data.id)
                newRole = roleDetails.data
            } catch (detailError) {
                console.warn("Could not fetch role details, using basic data:", detailError)
            }

            setRoles((prevRoles) => [...prevRoles, newRole])
            setStats((prev) => ({ ...prev, totalRoles: prev.totalRoles + 1 }))
            setRoleName("")
            setIsRoleDialogOpen(false)

            toast({
                title: "Success",
                description: `Role "${newRole.name}" created successfully`,
            })
        } catch (error: any) {
            console.error("Error creating role:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to create role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleUpdateRole() {
        if (!selectedRole) return

        const nameError = validateRoleName(roleName)
        if (nameError) {
            setErrors({ name: nameError })
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const response = await updateRole(selectedRole.id, { name: roleName.trim() })

            // Fetch the detailed role information including permissions
            let updatedRole = response.data
            try {
                const roleDetails = await getRole(response.data.id)
                updatedRole = roleDetails.data
            } catch (detailError) {
                console.warn("Could not fetch role details, using basic data:", detailError)
            }

            setRoles((prevRoles) => prevRoles.map((role) => (role.id === selectedRole.id ? updatedRole : role)))
            setRoleName("")
            setSelectedRole(null)
            setIsRoleDialogOpen(false)

            toast({
                title: "Success",
                description: `Role "${updatedRole.name}" updated successfully`,
            })
        } catch (error: any) {
            console.error("Error updating role:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to update role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleDeleteRole(role: Role) {
        setRoleToDelete(role)
        setIsDeleteDialogOpen(true)
    }

    async function confirmDeleteRole() {
        if (!roleToDelete) return

        setIsSubmitting(true)
        try {
            await deleteRole(roleToDelete.id)
            setRoles((prevRoles) => prevRoles.filter((r) => r.id !== roleToDelete.id))
            setStats((prev) => ({ ...prev, totalRoles: prev.totalRoles - 1 }))
            setIsDeleteDialogOpen(false)
            setRoleToDelete(null)

            toast({
                title: "Success",
                description: `Role "${roleToDelete.name}" deleted successfully`,
            })
        } catch (error: any) {
            console.error("Error deleting role:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to delete role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleOpenPermissionsDialog(role: Role) {
        setSelectedRole(role)
        setIsPermissionsDialogOpen(true)

        try {
            // If the role already has permissions, use those
            if (role.permissions && role.permissions.length > 0) {
                setSelectedPermissions(role.permissions.map((p) => p.name))
            } else {
                // Otherwise fetch the permissions
                const roleDetails = await getRole(role.id)
                const rolePermissions = roleDetails.data?.permissions || []
                setSelectedPermissions(rolePermissions.map((p) => p.name))
            }
        } catch (error) {
            console.error("Error fetching role details:", error)
            setSelectedPermissions([])
            toast({
                title: "Warning",
                description: "Could not load current permissions for this role.",
                variant: "destructive",
            })
        }
    }

    async function handleAssignPermissions() {
        if (!selectedRole) return

        setIsSubmitting(true)
        try {
            // Convert permission names to IDs for the API call
            const allPermissions = Object.values(permissionsByParent).flat()
            const permissionIds = selectedPermissions
                .map((name) => {
                    const permission = allPermissions.find((p) => p.name === name)
                    return permission?.id
                })
                .filter((id): id is number => id !== undefined)

            await assignPermissionsToRole(selectedRole.id, {
                permissions: permissionIds,
            })

            // Fetch the updated role with permissions
            const updatedRole = await getRole(selectedRole.id)

            // Update the role in the list with new permissions
            setRoles((prevRoles) => prevRoles.map((role) => (role.id === selectedRole.id ? updatedRole.data : role)))

            setIsPermissionsDialogOpen(false)
            setSelectedPermissions([])

            toast({
                title: "Success",
                description: `Permissions assigned to "${selectedRole.name}" successfully`,
            })
        } catch (error: any) {
            console.error("Error assigning permissions:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to assign permissions. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleAddEditRole(role?: Role) {
        setErrors({})
        if (role) {
            setSelectedRole(role)
            setRoleName(role.name)
        } else {
            setSelectedRole(null)
            setRoleName("")
        }
        setIsRoleDialogOpen(true)
    }

    function handlePermissionChange(permissionName: string, checked: boolean) {
        if (checked) {
            setSelectedPermissions((prev) => [...prev, permissionName])
        } else {
            setSelectedPermissions((prev) => prev.filter((name) => name !== permissionName))
        }
    }

    function handleSelectAllInCategory(categoryPermissions: Permission[], checked: boolean) {
        const permissionNames = categoryPermissions.map((p) => p.name)

        if (checked) {
            // Add all permissions from this category that aren't already selected
            setSelectedPermissions((prev) => {
                const newPermissions = [...prev]
                permissionNames.forEach((name) => {
                    if (!newPermissions.includes(name)) {
                        newPermissions.push(name)
                    }
                })
                return newPermissions
            })
        } else {
            // Remove all permissions from this category
            setSelectedPermissions((prev) => prev.filter((name) => !permissionNames.includes(name)))
        }
    }

    // Safely filter roles
    const filteredRoles = Array.isArray(roles)
        ? roles.filter((role) => role?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

    // Debug logging for render
    console.log("Render state:", {
        isLoadingRoles,
        isLoadingPermissions,
        rolesCount: roles.length,
        permissionsCategoriesCount: Object.keys(permissionsByParent).length,
        permissionsByParent,
    })

    if (isLoadingRoles || isLoadingPermissions) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                        <p className="text-muted-foreground">Manage user roles and their permissions</p>
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-5 w-32" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-1" />
                                <Skeleton className="h-4 w-24" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <Skeleton className="h-10 w-full md:w-96" />
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="rounded-md border">
                    <div className="p-4">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-48" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                        <Skeleton className="h-8 w-8 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground">Manage user roles and their permissions</p>
                </div>
                <Button onClick={() => handleAddEditRole()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Role
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRoles}</div>
                        <p className="text-xs text-muted-foreground">System roles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPermissions}</div>
                        <p className="text-xs text-muted-foreground">Available permissions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Permission Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.permissionCategories}</div>
                        <p className="text-xs text-muted-foreground">Functional areas</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="roles" className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                    <TabsTrigger value="roles">
                        <Shield className="mr-2 h-4 w-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="permissions">
                        <Key className="mr-2 h-4 w-4" />
                        Permissions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search roles..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchRoles} disabled={isLoadingRoles}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoadingRoles ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role Name</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRoles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            {searchQuery ? "No roles found matching your search." : "No roles found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRoles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions && role.permissions.length > 0 ? (
                                                        <>
                                                            <Badge variant="outline" className="mr-1">
                                                                {role.permissions.length} permissions
                                                            </Badge>
                                                            {/* Show first few permission names */}
                                                            {role.permissions.slice(0, 3).map((permission) => (
                                                                <Badge key={permission.id} variant="secondary" className="mr-1">
                                                                    {permission.name}
                                                                </Badge>
                                                            ))}
                                                            {role.permissions.length > 3 && (
                                                                <Badge variant="secondary">+{role.permissions.length - 3} more</Badge>
                                                            )}
                                                            {/* Show parent categories as well */}
                                                            <div className="w-full mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Categories: {Array.from(new Set(role.permissions.map((p) => p.parent))).join(", ")}
                                </span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <Badge variant="outline">No permissions</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{new Date(role.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenPermissionsDialog(role)}>
                                                        <Key className="mr-2 h-4 w-4" />
                                                        Permissions
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleAddEditRole(role)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role)}>
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
                </TabsContent>

                <TabsContent value="permissions" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Available Permissions</h2>
                        <Button variant="outline" size="sm" onClick={fetchPermissions} disabled={isLoadingPermissions}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoadingPermissions ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        {Object.keys(permissionsByParent).length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <p>No permissions found.</p>
                                <p className="text-sm mt-2">Check the browser console for debugging information.</p>
                            </div>
                        ) : (
                            <Accordion type="multiple" className="w-full">
                                {Object.entries(permissionsByParent).map(([parent, permissions]) => (
                                    <AccordionItem key={parent} value={parent}>
                                        <AccordionTrigger className="px-4">
                                            <div className="flex items-center">
                                                <span className="font-medium">{parent}</span>
                                                <Badge variant="secondary" className="ml-2">
                                                    {permissions.length}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4">
                                            <div className="space-y-2">
                                                {permissions.map((permission) => (
                                                    <div
                                                        key={permission.id}
                                                        className="flex items-center justify-between py-2 border-b last:border-0"
                                                    >
                                                        <div>
                                                            <p className="font-medium">{permission.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Guard: {permission.guard_name} • Parent: {permission.parent}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add/Edit Role Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedRole ? "Edit Role" : "Add New Role"}</DialogTitle>
                        <DialogDescription>
                            {selectedRole ? "Update the role details below." : "Enter the details for the new role."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Role Name</Label>
                            <Input
                                id="name"
                                value={roleName}
                                onChange={(e) => {
                                    setRoleName(e.target.value)
                                    if (errors.name) {
                                        setErrors((prev) => ({ ...prev, name: "" }))
                                    }
                                }}
                                placeholder="e.g., Administrator, Manager, etc."
                                className={errors.name ? "border-red-500" : ""}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" />
                                    {errors.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={selectedRole ? handleUpdateRole : handleCreateRole} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : selectedRole ? "Update Role" : "Create Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the role "{roleToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteRole} disabled={isSubmitting}>
                            {isSubmitting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assign Permissions Dialog */}
            <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Assign Permissions to {selectedRole?.name}</DialogTitle>
                        <DialogDescription>Select the permissions you want to assign to this role.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                            {Object.entries(permissionsByParent).map(([parent, permissions]) => {
                                const allSelected = permissions.every((p) => selectedPermissions.includes(p.name))
                                const someSelected = permissions.some((p) => selectedPermissions.includes(p.name))

                                return (
                                    <Card key={parent}>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`select-all-${parent}`}
                                                    checked={allSelected}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = someSelected && !allSelected
                                                    }}
                                                    onCheckedChange={(checked) => {
                                                        handleSelectAllInCategory(permissions, checked === true)
                                                    }}
                                                />
                                                <Label htmlFor={`select-all-${parent}`} className="text-sm font-medium cursor-pointer">
                                                    {parent}
                                                </Label>
                                                <Badge variant="outline">{permissions.length}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {permissions.map((permission) => (
                                                    <div key={permission.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`permission-${permission.id}`}
                                                            checked={selectedPermissions.includes(permission.name)}
                                                            onCheckedChange={(checked) => {
                                                                handlePermissionChange(permission.name, checked === true)
                                                            }}
                                                        />
                                                        <Label htmlFor={`permission-${permission.id}`} className="text-sm cursor-pointer">
                                                            {permission.name}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <div className="flex justify-between w-full">
                            <div className="text-sm text-muted-foreground">
                                {selectedPermissions.length} permissions selected
                                {selectedPermissions.length > 0 && selectedPermissions.length <= 10 && (
                                    <div className="mt-1 text-xs max-w-md">
                                        <strong>Selected:</strong> {selectedPermissions.join(", ")}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAssignPermissions} disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Save Permissions"}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
