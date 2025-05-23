import type { DeviceFilters, CreateDeviceData, UpdateDeviceData, DeviceResponse, Device } from "@/types/device"

export async function getDevices(filters: DeviceFilters = {}) {
    const params = new URLSearchParams()
    if (filters.name) params.set("name", filters.name)
    if (filters.status !== undefined) params.set("status", String(filters.status))
    if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
    if (filters.page) params.set("page", String(filters.page))

    try {
        const response = await fetch(`/api/proxy/devices?${params}`, {
            headers: {
                Accept: "application/json",
            },
        })
        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || "Failed to fetch devices")
        }
        return response.json() as Promise<DeviceResponse>
    } catch (error) {
        console.error("Error fetching devices:", error)
        throw error
    }
}

export async function getDevice(id: number) {
    const response = await fetch(`/api/proxy/devices/${id}`, {
        headers: {
            Accept: "application/json",
        },
    })
    if (!response.ok) throw new Error("Failed to fetch device")
    return response.json() as Promise<{ data: Device }>
}

export async function createDevice(data: CreateDeviceData) {
    const response = await fetch("/api/proxy/devices", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to create device")
    return response.json() as Promise<{ data: Device }>
}

export async function updateDevice(id: number, data: UpdateDeviceData) {
    const response = await fetch(`/api/proxy/devices/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update device")
    return response.json() as Promise<{ data: Device }>
}

export async function deleteDevice(id: number) {
    const response = await fetch(`/api/proxy/devices/${id}`, {
        method: "DELETE",
        headers: {
            Accept: "application/json",
        },
    })
    if (!response.ok) throw new Error("Failed to delete device")
    return response.json()
}
