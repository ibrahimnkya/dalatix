import type { BusStopFilters, CreateBusStopData, UpdateBusStopData } from "@/types/bus-stop"

export async function getBusStops(filters: BusStopFilters = {}) {
    const params = new URLSearchParams()
    if (filters.name) params.set("name", filters.name)
    if (filters.code) params.set("code", filters.code)
    if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
    if (filters.page) params.set("page", String(filters.page))

    try {
        const response = await fetch(`/api/proxy/bus_stops?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch bus stops"
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
        console.error("Error fetching bus stops:", error)
        throw error
    }
}

export async function getBusStop(id: number) {
    try {
        const response = await fetch(`/api/proxy/bus_stops/${id}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to fetch bus stop"
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
        console.error("Error fetching bus stop:", error)
        throw error
    }
}

export async function createBusStop(data: CreateBusStopData) {
    try {
        const response = await fetch("/api/proxy/bus_stops", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to create bus stop"
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
        console.error("Error creating bus stop:", error)
        throw error
    }
}

export async function updateBusStop(id: number, data: UpdateBusStopData) {
    try {
        const response = await fetch(`/api/proxy/bus_stops/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to update bus stop"
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
        console.error("Error updating bus stop:", error)
        throw error
    }
}

export async function deleteBusStop(id: number) {
    try {
        const response = await fetch(`/api/proxy/bus_stops/${id}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            // Try to parse error message, but don't fail if it's not JSON
            let errorMessage = "Failed to delete bus stop"
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
        console.error("Error deleting bus stop:", error)
        throw error
    }
}
