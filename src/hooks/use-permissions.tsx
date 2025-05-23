"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface PermissionsContextType {
    permissions: string[]
    roles: string[]
    hasPermission: (permission: string | string[]) => boolean
    hasRole: (role: string | string[]) => boolean
    setUserPermissions: (permissions: string[], roles: string[]) => void
}

const PermissionsContext = createContext<PermissionsContextType>({
    permissions: [],
    roles: [],
    hasPermission: () => false,
    hasRole: () => false,
    setUserPermissions: () => {},
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<string[]>([])
    const [roles, setRoles] = useState<string[]>([])

    // Attempt to load permissions from localStorage on mount
    useEffect(() => {
        try {
            const storedPermissions = localStorage.getItem("user_permissions")
            const storedRoles = localStorage.getItem("user_roles")

            if (storedPermissions) {
                setPermissions(JSON.parse(storedPermissions))
            }

            if (storedRoles) {
                setRoles(JSON.parse(storedRoles))
            }
        } catch (error) {
            console.error("Error loading permissions from storage:", error)
        }
    }, [])

    const hasPermission = (requiredPermission: string | string[]): boolean => {
        if (!permissions.length) return false

        if (Array.isArray(requiredPermission)) {
            // For array input, check if user has ANY of the permissions (OR logic)
            return requiredPermission.some((perm) => permissions.includes(perm))
        }

        // For string input, directly check if permission exists
        return permissions.includes(requiredPermission)
    }

    const hasRole = (requiredRole: string | string[]): boolean => {
        if (!roles.length) return false

        if (Array.isArray(requiredRole)) {
            // For array input, check if user has ANY of the roles (OR logic)
            return requiredRole.some((role) => roles.includes(role))
        }

        // For string input, directly check if role exists
        return roles.includes(requiredRole)
    }

    const setUserPermissions = (newPermissions: string[], newRoles: string[]) => {
        setPermissions(newPermissions)
        setRoles(newRoles)

        // Store in localStorage for persistence
        try {
            localStorage.setItem("user_permissions", JSON.stringify(newPermissions))
            localStorage.setItem("user_roles", JSON.stringify(newRoles))
        } catch (error) {
            console.error("Error storing permissions:", error)
        }
    }

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                roles,
                hasPermission,
                hasRole,
                setUserPermissions,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    )
}

export function usePermissions() {
    return useContext(PermissionsContext)
}
