export interface User {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    id_number?: string
    is_active: boolean
    use_float?: boolean
    company_id?: number
    company?: {
        id: number
        name: string
    }
    type: string
    created_at: string
    updated_at: string
    roles?: Array<{
        id: number
        name: string
        permissions?: Array<{
            id: number
            name: string
        }>
    }>
}

export interface CreateUserData {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    id_number?: string
    is_active: boolean
    use_float?: boolean
    company_id: number
    type: string
    password: string
    otp?: string
}

export interface UpdateUserData {
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    id_number?: string
    is_active: boolean
    use_float?: boolean
    company_id: number
    type: string
    password?: string
    otp?: string
}

interface GetUsersParams {
    paginate?: boolean
    page?: number
    per_page?: number
    search?: string
}

export async function getUsers(params: GetUsersParams = {}) {
    try {
        // Construct URL with query parameters
        const url = new URL("/api/proxy/users", window.location.origin)

        if (params.paginate) {
            url.searchParams.append("paginate", "true")
        }

        if (params.page) {
            url.searchParams.append("page", params.page.toString())
        }

        if (params.per_page) {
            url.searchParams.append("per_page", params.per_page.toString())
        }

        if (params.search) {
            url.searchParams.append("search", params.search)
        }

        console.log("Fetching users from:", url.toString())

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to fetch users")
        }

        return await response.json()
    } catch (error) {
        console.error("Error in getUsers:", error)
        throw error
    }
}

export async function getUser(id: number) {
    try {
        const url = new URL(`/api/proxy/users/${id}`, window.location.origin)

        console.log("Fetching user details from:", url.toString())

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to fetch user details")
        }

        return await response.json()
    } catch (error) {
        console.error("Error in getUser:", error)
        throw error
    }
}

export async function createUser(data: CreateUserData) {
    try {
        const url = new URL("/api/proxy/users", window.location.origin)

        console.log("Creating user:", data)

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to create user")
        }

        return await response.json()
    } catch (error) {
        console.error("Error in createUser:", error)
        throw error
    }
}

export async function updateUser(id: number, data: UpdateUserData) {
    try {
        const url = new URL(`/api/proxy/users/${id}`, window.location.origin)

        console.log("Updating user:", id, data)

        const response = await fetch(url.toString(), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to update user")
        }

        return await response.json()
    } catch (error) {
        console.error("Error in updateUser:", error)
        throw error
    }
}

export async function deleteUser(id: number) {
    try {
        const url = new URL(`/api/proxy/users/${id}`, window.location.origin)

        console.log("Deleting user:", id)

        const response = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || "Failed to delete user")
        }

        return await response.json()
    } catch (error) {
        console.error("Error in deleteUser:", error)
        throw error
    }
}
