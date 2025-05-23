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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Search, Edit, Trash2, Shield, Key, RefreshCcw } from "lucide-react"
import type { Role } from "@/types/role"
import type { Permission } from "@/types/permission"
import { getRoles, getRole, createRole, updateRole, deleteRole, assignPermissionsToRole } from "@/lib/services/role"
import { getPermissionsByParent } from "@/lib/services/permission"

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
    const [roleName, setRoleName] = useState("")
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [stats, setStats] = useState({
        totalRoles: 0,
        totalPermissions: 0,
        permissionCategories: 0,
    })

    useEffect(() => {
        fetchRoles()
        fetchPermissions()
    }, [])

    async function fetchRoles() {
        setIsLoadingRoles(true)
        try {
            const response = await getRoles({ paginate: true })
            // Check for nested data structure (response.data.data)
            let rolesData = []
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
                rolesData = response.data.data
            } else if (Array.isArray(response.data)) {
                rolesData = response.data
            }

            // Fetch detailed role information including permissions for each role
            const detailedRoles = await Promise.all(
                rolesData.map(async (role) => {
                    try {
                        const roleDetails = await getRole(role.id)
                        return roleDetails.data
                    } catch (error) {
                        console.error(`Error fetching details for role ${role.id}:`, error)
                        return role // Return the basic role if details fetch fails
                    }
                }),
            )

            setRoles(detailedRoles)
            setStats((prev) => ({ ...prev, totalRoles: detailedRoles.length || 0 }))
        } catch (error) {
            console.error("Error fetching roles:", error)
            toast({
                title: "Error",
                description: "Failed to fetch roles. Please try again.",
                variant: "destructive",
            })
            // Set roles to empty array on error
            setRoles([])
        } finally {
            setIsLoadingRoles(false)
        }
    }

    async function fetchPermissions() {
        setIsLoadingPermissions(true)
        try {
            const groupedPermissions = await getPermissionsByParent()
            setPermissionsByParent(groupedPermissions)

            // Calculate stats
            let totalPermissions = 0
            Object.values(groupedPermissions).forEach((permissions) => {
                totalPermissions += permissions.length
            })

            setStats((prev) => ({
                ...prev,
                totalPermissions,
                permissionCategories: Object.keys(groupedPermissions).length,
            }))
        } catch (error) {
            console.error("Error fetching permissions:", error)
            toast({
                title: "Error",
                description: "Failed to fetch permissions. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsLoadingPermissions(false)
        }
    }

    async function handleCreateRole() {
        if (!roleName.trim()) {
            toast({
                title: "Validation Error",
                description: "Role name is required",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const response = await createRole({ name: roleName })
            // Fetch the detailed role information including permissions
            const roleDetails = await getRole(response.data.id)
            setRoles([...roles, roleDetails.data])
            setRoleName("")
            setIsRoleDialogOpen(false)
            toast({
                title: "Success",
                description: "Role created successfully",
            })
        } catch (error) {
            console.error("Error creating role:", error)
            toast({
                title: "Error",
                description: "Failed to create role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleUpdateRole() {
        if (!selectedRole || !roleName.trim()) {
            toast({
                title: "Validation Error",
                description: "Role name is required",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const response = await updateRole(selectedRole.id, { name: roleName })
            // Fetch the detailed role information including permissions
            const roleDetails = await getRole(response.data.id)
            setRoles(roles.map((role) => (role.id === selectedRole.id ? roleDetails.data : role)))
            setRoleName("")
            setSelectedRole(null)
            setIsRoleDialogOpen(false)
            toast({
                title: "Success",
                description: "Role updated successfully",
            })
        } catch (error) {
            console.error("Error updating role:", error)
            toast({
                title: "Error",
                description: "Failed to update role. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDeleteRole(role: Role) {
        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            try {
                await deleteRole(role.id)
                setRoles(roles.filter((r) => r.id !== role.id))
                toast({
                    title: "Success",
                    description: "Role deleted successfully",
                })
            } catch (error) {
                console.error("Error deleting role:", error)
                toast({
                    title: "Error",
                    description: "Failed to delete role. Please try again.",
                    variant: "destructive",
                })
            }
        }
    }

    async function handleOpenPermissionsDialog(role: Role) {
        setSelectedRole(role)
        setIsPermissionsDialogOpen(true)

        try {
            // If the role already has permissions, use those
            if (role.permissions && role.permissions.length > 0) {
                setSelectedPermissions(role.permissions.map((p) => p.id))
            } else {
                // Otherwise fetch the permissions
                const roleDetails = await getRole(role.id)
                const rolePermissions = roleDetails.data?.permissions || []
                setSelectedPermissions(rolePermissions.map((p) => p.id))
            }
        } catch (error) {
            console.error("Error fetching role details:", error)
            toast({
                title: "Error",
                description: "Failed to fetch role permissions. Please try again.",
                variant: "destructive",
            })
        }
    }

    async function handleAssignPermissions() {
        if (!selectedRole) return

        setIsSubmitting(true)
        try {
            const response = await assignPermissionsToRole(selectedRole.id, {
                permissions: selectedPermissions,
            })

            // Fetch the updated role with permissions
            const updatedRole = await getRole(selectedRole.id)

            // Update the role in the list with new permissions
            setRoles(roles.map((role) => (role.id === selectedRole.id ? updatedRole.data : role)))

            setIsPermissionsDialogOpen(false)
            toast({
                title: "Success",
                description: `Permissions assigned to ${selectedRole.name} successfully`,
            })
        } catch (error) {
            console.error("Error assigning permissions:", error)
            toast({
                title: "Error",
                description: "Failed to assign permissions. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    function handleAddEditRole(role?: Role) {
        if (role) {
            setSelectedRole(role)
            setRoleName(role.name)
        } else {
            setSelectedRole(null)
            setRoleName("")
        }
        setIsRoleDialogOpen(true)
    }

    function handlePermissionChange(permissionId: number, checked: boolean) {
        if (checked) {
            setSelectedPermissions([...selectedPermissions, permissionId])
        } else {
            setSelectedPermissions(selectedPermissions.filter((id) => id !== permissionId))
        }
    }

    function handleSelectAllInCategory(categoryPermissions: Permission[], checked: boolean) {
        const permissionIds = categoryPermissions.map((p) => p.id)

        if (checked) {
            // Add all permissions from this category that aren't already selected
            const newPermissions = [...selectedPermissions]
            permissionIds.forEach((id) => {
                if (!newPermissions.includes(id)) {
                    newPermissions.push(id)
                }
            })
            setSelectedPermissions(newPermissions)
        } else {
            // Remove all permissions from this category
            setSelectedPermissions(selectedPermissions.filter((id) => !permissionIds.includes(id)))
        }
    }

    // Safely filter roles
    const filteredRoles = Array.isArray(roles)
        ? roles.filter((role) => role?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : []

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
                        <Button variant="outline" size="sm" onClick={fetchRoles}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
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
                                            No roles found.
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
                                                            {Array.from(new Set(role.permissions.map((p) => p.parent)))
                                                                .slice(0, 3)
                                                                .map((parent) => (
                                                                    <Badge key={parent} variant="secondary" className="mr-1">
                                                                        {parent}
                                                                    </Badge>
                                                                ))}
                                                            {Array.from(new Set(role.permissions.map((p) => p.parent))).length > 3 && (
                                                                <Badge variant="secondary">
                                                                    +{Array.from(new Set(role.permissions.map((p) => p.parent))).length - 3} more
                                                                </Badge>
                                                            )}
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
                        <Button variant="outline" size="sm" onClick={fetchPermissions}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>

                    <div className="rounded-md border">
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
                                                            ID: {permission.id} • Guard: {permission.guard_name}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
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
                                onChange={(e) => setRoleName(e.target.value)}
                                placeholder="e.g., Administrator, Manager, etc."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={selectedRole ? handleUpdateRole : handleCreateRole} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : selectedRole ? "Update Role" : "Create Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                const allSelected = permissions.every((p) => selectedPermissions.includes(p.id))
                                const someSelected = permissions.some((p) => selectedPermissions.includes(p.id))

                                return (
                                    <Card key={parent}>
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`select-all-${parent}`}
                                                    checked={allSelected}
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
                                                            checked={selectedPermissions.includes(permission.id)}
                                                            onCheckedChange={(checked) => {
                                                                handlePermissionChange(permission.id, checked === true)
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
                            <div className="text-sm text-muted-foreground">{selectedPermissions.length} permissions selected</div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
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
