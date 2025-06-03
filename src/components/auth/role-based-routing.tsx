"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { hasRole, getToken } from "@/lib/auth"

interface RoleBasedRoutingProps {
    children: React.ReactNode
}

export function RoleBasedRouting({ children }: RoleBasedRoutingProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)
    const [hasChecked, setHasChecked] = useState(false)

    useEffect(() => {
        const checkRoleAndRedirect = () => {
            // Skip role checks for auth pages
            if (pathname === "/") {
                setIsLoading(false)
                setHasChecked(true)
                return
            }

            // Check if user has a valid token
            const token = getToken()
            if (!token) {
                console.log("No token found, redirecting to login")
                router.replace("/")
                setIsLoading(false)
                setHasChecked(true)
                return
            }

            try {
                const isBusOwner = hasRole("Bus Owner")
                const isAdmin = hasRole("Admin") || hasRole("Super Admin") || hasRole("System Admin")

                console.log("Role check:", { isBusOwner, isAdmin, pathname })

                // Only redirect if user is trying to access wrong section
                // Don't redirect if they're already in the correct section
                if (isBusOwner && pathname.startsWith("/admin")) {
                    console.log("Bus owner trying to access admin area, redirecting to bus-owner portal")
                    router.replace("/bus-owner/dashboard")
                    setIsLoading(false)
                    setHasChecked(true)
                    return
                }

                if (isAdmin && !isBusOwner && pathname.startsWith("/bus-owner")) {
                    console.log("Admin trying to access bus-owner area, redirecting to admin portal")
                    router.replace("/admin/dashboard")
                    setIsLoading(false)
                    setHasChecked(true)
                    return
                }

                // If user has no recognized role, redirect to login
                if (!isBusOwner && !isAdmin) {
                    console.log("No valid role detected, redirecting to login")
                    router.replace("/")
                    setIsLoading(false)
                    setHasChecked(true)
                    return
                }

                // User is in correct section, allow navigation
                setIsLoading(false)
                setHasChecked(true)
            } catch (error) {
                console.error("Error in role-based routing:", error)
                setIsLoading(false)
                setHasChecked(true)
            }
        }

        // Only run the check if we haven't checked yet or if it's the initial load
        if (!hasChecked) {
            const timer = setTimeout(checkRoleAndRedirect, 100)
            return () => clearTimeout(timer)
        } else {
            // For subsequent navigation within the same section, just allow it
            setIsLoading(false)
        }
    }, [pathname, router, hasChecked])

    // Show loading state while checking roles
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
