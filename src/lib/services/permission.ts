import type { PermissionResponse } from "@/types/permission"

// Helper function to check if the user has a specific permission
export function hasPermission(userPermissions: string[] | undefined, requiredPermission: string): boolean {
    if (!userPermissions || userPermissions.length === 0) {
        return false
    }
    return userPermissions.includes(requiredPermission)
}

export async function getPermissions() {
    try {
        const response = await fetch(`/api/proxy/permissions`, {
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to fetch permissions")
        }

        return response.json() as Promise<PermissionResponse>
    } catch (error) {
        console.error("Error fetching permissions:", error)
        throw error
    }
}

// Get current user permissions (typically used during app initialization)
export async function getCurrentUserPermissions(): Promise<string[]> {
    try {
        const response = await fetch(`/api/proxy/user/permissions`, {
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to fetch user permissions")
        }

        const data = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Error fetching user permissions:", error)
        return []
    }
}

// Add the missing getPermissionsByParent function
export async function getPermissionsByParent(): Promise<Record<string, any[]>> {
    try {
        const response = await fetch(`/api/proxy/permissions?group_by=parent`, {
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to fetch permissions by parent")
        }

        const data = await response.json()

        // Ensure we're returning a properly formatted object with arrays
        const result: Record<string, any[]> = {}

        // If data.data exists and is an object, process it
        if (data && data.data && typeof data.data === "object") {
            // Convert each entry to ensure it's an array
            Object.entries(data.data).forEach(([key, value]) => {
                result[key] = Array.isArray(value) ? value : []
            })
            return result
        }

        // If the API doesn't return grouped permissions, try to group them manually
        if (data && Array.isArray(data.data)) {
            data.data.forEach((permission) => {
                const parent = permission.parent || "Other"
                if (!result[parent]) {
                    result[parent] = []
                }
                result[parent].push(permission)
            })
            return result
        }

        // Fallback to empty object
        return {}
    } catch (error) {
        console.error("Error fetching permissions by parent:", error)
        return {}
    }
}
