import type {
    ProblemResponse,
    SingleProblemResponse,
    CreateProblemData,
    UpdateProblemStatusData,
    AssignProblemData,
} from "@/types/problem"

export async function getProblems(
    params: {
        page?: number
        per_page?: number
        status?: string
        paginate?: boolean
    } = {},
): Promise<ProblemResponse> {
    try {
        const queryParams = new URLSearchParams()

        if (params.paginate) {
            queryParams.append("paginate", "true")
        }

        if (params.page) {
            queryParams.append("page", String(params.page))
        }

        if (params.per_page) {
            queryParams.append("per_page", String(params.per_page))
        }

        if (params.status) {
            queryParams.append("status", params.status)
        }

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""
        const response = await fetch(`/api/proxy/problems${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to fetch problems"
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
        console.error("Error in getProblems:", error)
        throw error
    }
}

export async function getProblem(id: number): Promise<SingleProblemResponse> {
    try {
        const response = await fetch(`/api/proxy/problems/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to fetch problem"
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
        console.error("Error in getProblem:", error)
        throw error
    }
}

export async function getAssigneeProblems(): Promise<ProblemResponse> {
    try {
        const response = await fetch("/api/proxy/assignee_problems", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to fetch assignee problems"
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
        console.error("Error in getAssigneeProblems:", error)
        throw error
    }
}

export async function createProblem(data: CreateProblemData): Promise<SingleProblemResponse> {
    try {
        const response = await fetch("/api/proxy/problems", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = "Failed to create problem"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const responseData = await response.json()
        return responseData
    } catch (error) {
        console.error("Error in createProblem:", error)
        throw error
    }
}

export async function updateProblemStatus(id: number, data: UpdateProblemStatusData): Promise<SingleProblemResponse> {
    try {
        const response = await fetch(`/api/proxy/problems/${id}/update_status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = "Failed to update problem status"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const responseData = await response.json()
        return responseData
    } catch (error) {
        console.error("Error in updateProblemStatus:", error)
        throw error
    }
}

export async function assignProblem(id: number, data: AssignProblemData): Promise<SingleProblemResponse> {
    try {
        const response = await fetch(`/api/proxy/problems/${id}/assign`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            let errorMessage = "Failed to assign problem"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const responseData = await response.json()
        return responseData
    } catch (error) {
        console.error("Error in assignProblem:", error)
        throw error
    }
}

export async function deleteProblem(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`/api/proxy/problems/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            let errorMessage = "Failed to delete problem"
            try {
                const errorData = await response.json()
                errorMessage = errorData.message || errorMessage
            } catch (e) {
                errorMessage = response.statusText || errorMessage
            }
            throw new Error(errorMessage)
        }

        const data = await response.json()
        return { success: true, message: data.message || "Problem deleted successfully" }
    } catch (error) {
        console.error("Error in deleteProblem:", error)
        throw error
    }
}
