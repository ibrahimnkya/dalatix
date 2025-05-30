import type { Role } from "@/types/role"

export interface RoleFilters {
    name?: string
    guard_name?: string
    paginate?: boolean
    page?: number
    per_page?: number
}

export interface RoleResponse {
    success: boolean
    data: Role[]
    message: string
    code: number
    meta?: {
        current_page: number
        from: number
        last_page: number
        path: string
        per_page: number
        to: number
        total: number
    }
}

export async function getRoles(params: RoleFilters = {}): Promise<RoleResponse> {
    try {
        const queryParams = new URLSearchParams()

        if (params.name) {
            queryParams.append("name", params.name)
        }

        if (params.guard_name) {
            queryParams.append("guard_name", params.guard_name)
        }

        if (params.paginate) {
            queryParams.append("paginate", "true")
        }

        if (params.page) {
            queryParams.append("page", String(params.page))
        }

        if (params.per_page) {
            queryParams.append("per_page", String(params.per_page))
        }

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""
        const response = await fetch(`/api/proxy/roles${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to fetch roles"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error in getRoles:", error)
        throw error
    }
}

export async function getRole(id: number): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/roles/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = `Failed to fetch role ${id}`
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error(`Error in getRole ${id}:`, error)
        throw error
    }
}

export async function createRole(data: { name: string }): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/roles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = "Failed to create role"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error("Error in createRole:", error)
        throw error
    }
}

export async function updateRole(id: number, data: { name: string }): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/roles/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = `Failed to update role ${id}`
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error(`Error in updateRole ${id}:`, error)
        throw error
    }
}

export async function deleteRole(id: number): Promise<any> {
    try {
        // Check if the backend supports DELETE method for roles
        // If not, we might need to use a different endpoint or method
        const response = await fetch(`/api/proxy/roles/${id}/delete`, {
            method: "POST", // Using POST instead of DELETE
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = `Failed to delete role ${id}`
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error(`Error deleting role with ID ${id}:`, error)
        throw error
    }
}

export async function assignPermissionsToRole(roleId: number, data: { permissions: number[] }): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/roles/${roleId}/assign_permissions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = `Failed to assign permissions to role ${roleId}`
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error(`Error in assignPermissionsToRole ${roleId}:`, error)
        throw error
    }
}

export async function assignRoleToUser(userId: number, roleId: number): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/users/${userId}/assign_roles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ role_ids: [roleId] }),
        })

        if (!response.ok) {
            let errorMessage = "Failed to assign role to user"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error("Error in assignRoleToUser:", error)
        throw error
    }
}

export async function removeRoleFromUser(userId: number, roleId: number): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/users/${userId}/remove_roles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ role_ids: [roleId] }),
        })

        if (!response.ok) {
            let errorMessage = "Failed to remove role from user"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error("Error in removeRoleFromUser:", error)
        throw error
    }
}

export async function assignVehicleToUser(userId: number, vehicleId: number): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/users/${userId}/assign_vehicle`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ vehicle_id: vehicleId }),
        })

        if (!response.ok) {
            let errorMessage = "Failed to assign vehicle to user"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error("Error in assignVehicleToUser:", error)
        throw error
    }
}

export async function removeVehicleFromUser(userId: number, vehicleId: number): Promise<any> {
    try {
        const response = await fetch(`/api/proxy/users/${userId}/remove_vehicle`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ vehicle_id: vehicleId }),
        })

        if (!response.ok) {
            let errorMessage = "Failed to remove vehicle from user"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        return response.json()
    } catch (error) {
        console.error("Error in removeVehicleFromUser:", error)
        throw error
    }
}
