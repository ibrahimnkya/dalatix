import type { CompanyFilters, CreateCompanyData, UpdateCompanyData } from "@/types/company"

export async function getCompanies(filters: CompanyFilters = {}) {
  const params = new URLSearchParams()
  if (filters.name) params.set("name", filters.name)
  if (filters.is_active !== undefined) params.set("is_active", String(filters.is_active))
  if (filters.paginate !== undefined) params.set("paginate", String(filters.paginate))
  if (filters.page) params.set("page", String(filters.page))

  try {
    const response = await fetch(`/api/proxy/companies?${params}`, {
      headers: {
        Accept: "application/json",
      },
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to fetch companies")
    }
    return response.json()
  } catch (error) {
    console.error("Error fetching companies:", error)
    throw error
  }
}

export async function getCompany(id: number) {
  const response = await fetch(`/api/proxy/companies/${id}`, {
    headers: {
      Accept: "application/json",
    },
  })
  if (!response.ok) throw new Error("Failed to fetch company")
  return response.json()
}

export async function createCompany(data: CreateCompanyData) {
  const response = await fetch("/api/proxy/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to create company")
  return response.json()
}

export async function updateCompany(id: number, data: UpdateCompanyData) {
  const response = await fetch(`/api/proxy/companies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Failed to update company")
  return response.json()
}

export async function deleteCompany(id: number) {
  const response = await fetch(`/api/proxy/companies/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
    },
  })
  if (!response.ok) throw new Error("Failed to delete company")
  return response.json()
}
