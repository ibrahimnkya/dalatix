"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getUserRoles, getUserPermissions } from "@/lib/auth"

interface PermissionsContextType {
    roles: string[]
    permissions: string[]
    companyId: number | null
    hasPermission: (permission: string) => boolean
    hasRole: (role: string) => boolean
    hasAnyPermission: (permissions: string[]) => boolean
    hasAllPermissions: (permissions: string[]) => boolean
    setUserPermissions: (roles: string[], permissions: string[], companyId?: number | null) => void
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [roles, setRoles] = useState<string[]>([])
    const [permissions, setPermissions] = useState<string[]>([])
    const [companyId, setCompanyId] = useState<number | null>(null)

    useEffect(() => {
        // Load permissions from localStorage on initial mount
        const storedRoles = getUserRoles()
        const storedPermissions = getUserPermissions()
        const storedCompanyId = localStorage.getItem("user_company_id")

        setRoles(storedRoles)
        setPermissions(storedPermissions)
        setCompanyId(storedCompanyId ? Number.parseInt(storedCompanyId, 10) : null)

        // Debug logging
        console.log("Initial permissions loaded:", {
            roles: storedRoles,
            permissions: storedPermissions.length,
            companyId: storedCompanyId,
        })
    }, [])

    const hasPermission = (permission: string): boolean => {
        return permissions.includes(permission)
    }

    const hasRole = (role: string): boolean => {
        return roles.includes(role)
    }

    const hasAnyPermission = (permissionList: string[]): boolean => {
        return permissionList.some((permission) => permissions.includes(permission))
    }

    const hasAllPermissions = (permissionList: string[]): boolean => {
        return permissionList.every((permission) => permissions.includes(permission))
    }

    const setUserPermissions = (newRoles: string[], newPermissions: string[], newCompanyId?: number | null) => {
        setRoles(newRoles)
        setPermissions(newPermissions)

        if (newCompanyId !== undefined) {
            setCompanyId(newCompanyId)

            // Also update localStorage
            if (newCompanyId !== null) {
                localStorage.setItem("user_company_id", String(newCompanyId))
            } else {
                localStorage.removeItem("user_company_id")
            }
        }
    }

    return (
        <PermissionsContext.Provider
            value={{
                roles,
                permissions,
                companyId,
                hasPermission,
                hasRole,
                hasAnyPermission,
                hasAllPermissions,
                setUserPermissions,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    )
}

export function usePermissions() {
    const context = useContext(PermissionsContext)
    if (context === undefined) {
        throw new Error("usePermissions must be used within a PermissionsProvider")
    }

    // For debugging
    const isBusOwner = context.hasRole("Bus Owner")
    console.log("isBusOwner check:", {
        companyId: context.companyId,
        hasCompanyId: context.companyId !== null,
        result: isBusOwner,
        roles: context.roles,
    })

    return context
}
