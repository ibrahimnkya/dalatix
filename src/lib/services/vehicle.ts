import type { VehicleFilters, CreateVehicleData, UpdateVehicleData } from "@/types/vehicle"

export async function getVehicles(filters: VehicleFilters = {}) {
    const params = new URLSearchParams()
    if (filters.company_id) params.set("company_id", String(filters.company_id))
    if (filters.status) params.set("status", filters.status)
    if (filters.name) params.set("name", filters.name)
    if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
    if (filters.conductor_id) params.set("conductor_id", String(filters.conductor_id))
    if (filters.page) params.set("page", String(filters.page))

    try {
        const response = await fetch(`/api/proxy/vehicles?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch vehicles"
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
        console.error("Error fetching vehicles:", error)
        throw error
    }
}

export async function getVehicle(id: number) {
    try {
        const response = await fetch(`/api/proxy/vehicles/${id}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch vehicle"
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
        console.error("Error fetching vehicle:", error)
        throw error
    }
}

export async function createVehicle(data: CreateVehicleData) {
    try {
        const response = await fetch("/api/proxy/vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to create vehicle"
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
        console.error("Error creating vehicle:", error)
        throw error
    }
}

export async function updateVehicle(id: number, data: UpdateVehicleData) {
    try {
        const response = await fetch(`/api/proxy/vehicles/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to update vehicle"
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
        console.error("Error updating vehicle:", error)
        throw error
    }
}

export async function deleteVehicle(id: number) {
    try {
        const response = await fetch(`/api/proxy/vehicles/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to delete vehicle"
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
        console.error("Error deleting vehicle:", error)
        throw error
    }
}
