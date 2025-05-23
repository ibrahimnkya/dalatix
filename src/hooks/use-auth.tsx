"use client"

import { useEffect } from "react"
import { usePermissions } from "@/hooks/use-permissions"

export function useAuth() {
    const { setUserPermissions } = usePermissions()

    useEffect(() => {
        // This effect runs once on component mount
        try {
            // Check if user data exists in localStorage
            const storedUser = localStorage.getItem("user")

            if (storedUser) {
                const parsedUser = JSON.parse(storedUser)

                // Extract and set permissions from the stored user
                if (parsedUser.permissions && parsedUser.roles) {
                    const permissionNames = parsedUser.permissions
                        .map((p: any) => (typeof p === "string" ? p : p.name))
                        .filter(Boolean)

                    const roleNames = parsedUser.roles.map((r: any) => (typeof r === "string" ? r : r.name)).filter(Boolean)

                    setUserPermissions(permissionNames, roleNames)
                }
            }
        } catch (error) {
            console.error("Error loading user data:", error)
        }
    }, [setUserPermissions])

    return null
}
