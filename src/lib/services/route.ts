import type { RouteFilters, CreateRouteData, UpdateRouteData } from "@/types/route"

export async function getRoutes(filters: RouteFilters = {}) {
    const params = new URLSearchParams()
    if (filters.name) params.set("name", filters.name)
    if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active))
    if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
    if (filters.page) params.set("page", String(filters.page))

    try {
        // Check if we're using the correct endpoint
        const response = await fetch(`/api/proxy/routes?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch routes"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }
        return response.json()
    } catch (error) {
        console.error("Error fetching routes:", error)
        throw error
    }
}

export async function getRoute(id: number) {
    try {
        const response = await fetch(`/api/proxy/routes/${id}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch route"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }
        return response.json()
    } catch (error) {
        console.error("Error fetching route:", error)
        throw error
    }
}

export async function createRoute(data: CreateRouteData) {
    try {
        const response = await fetch("/api/proxy/routes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to create route"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }
        return response.json()
    } catch (error) {
        console.error("Error creating route:", error)
        throw error
    }
}

export async function updateRoute(id: number, data: UpdateRouteData) {
    try {
        const response = await fetch(`/api/proxy/routes/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to update route"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }
        return response.json()
    } catch (error) {
        console.error("Error updating route:", error)
        throw error
    }
}

export async function deleteRoute(id: number) {
    try {
        const response = await fetch(`/api/proxy/routes/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to delete route"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }
        return response.json()
    } catch (error) {
        console.error("Error deleting route:", error)
        throw error
    }
}
