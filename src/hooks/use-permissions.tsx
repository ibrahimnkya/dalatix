"use client"

import { createContext, useState, useEffect, type ReactNode, useContext } from "react"

interface PermissionsContextType {
    permissions: string[]
    roles: string[]
    companyId: number | null
    hasPermission: (permission: string | string[]) => boolean
    hasRole: (role: string | string[]) => boolean
    setUserPermissions: (permissions: string[], roles: string[], companyId?: number) => void
    isBusOwner: () => boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
    permissions: [],
    roles: [],
    companyId: null,
    hasPermission: () => false,
    hasRole: () => false,
    setUserPermissions: () => {},
    isBusOwner: () => false,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([])
    const [roles, setRoles] = useState<string[]>([])
    const [companyId, setCompanyId] = useState<number | null>(null)

    // Attempt to load permissions from localStorage on mount
    useEffect(() => {
        try {
            const storedPermissions = localStorage.getItem("user_permissions")
            const storedRoles = localStorage.getItem("user_roles")
            const storedCompanyId = localStorage.getItem("user_company_id")

            if (storedPermissions) {
                setPermissions(JSON.parse(storedPermissions))
            }

            if (storedRoles) {
                setRoles(JSON.parse(storedRoles))
            }

            if (storedCompanyId) {
                setCompanyId(Number.parseInt(storedCompanyId))
            }
        } catch (error) {
            console.error("Error loading permissions from storage:", error)
        }
    }, [])

    const isBusOwner = (): boolean => {
        return roles.includes("Bus Owner")
    }

    const setUserPermissions = (newPermissions: string[], newRoles: string[], newCompanyId?: number) => {
        setPermissions(newPermissions)
        setRoles(newRoles)
        if (newCompanyId) {
            setCompanyId(newCompanyId)
        }

        // Store in localStorage for persistence
        try {
            localStorage.setItem("user_permissions", JSON.stringify(newPermissions))
            localStorage.setItem("user_roles", JSON.stringify(newRoles))
            if (newCompanyId) {
                localStorage.setItem("user_company_id", newCompanyId.toString())
            }
        } catch (error) {
            console.error("Error storing permissions:", error)
        }
    }

    // Define the hasPermission function within the component
    const hasPermission = (permission: string | string[]): boolean => {
        if (Array.isArray(permission)) {
            // Check if the user has any of the permissions in the array
            return permission.some((p) => permissions.includes(p))
        }

        // Check if the user has the specific permission
        return permissions.includes(permission)
    }

    // Define the hasRole function within the component
    const hasRole = (role: string | string[]): boolean => {
        if (Array.isArray(role)) {
            // Check if the user has any of the roles in the array
            return role.some((r) => roles.includes(r))
        }

        // Check if the user has the specific role
        return roles.includes(role)
    }

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                roles,
                companyId,
                hasPermission,
                hasRole,
                setUserPermissions,
                isBusOwner,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    )
}

// Export the hook to use the context
export function usePermissions() {
    const context = useContext(PermissionsContext)
    if (!context) {
        throw new Error("usePermissions must be used within a PermissionsProvider")
    }
    return context
}
