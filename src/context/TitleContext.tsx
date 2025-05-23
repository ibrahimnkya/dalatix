"use client"

import * as React from "react"
import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"

// Define route title mapping
export const routeTitles: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/companies": "Companies",
    "/admin/users": "Users",
    "/admin/vehicles": "Vehicles",
    "/admin/bus-stops": "Bus Stops",
    "/admin/routes": "Routes",
    "/admin/bookings": "Bookings",
    "/admin/devices": "Devices",
    "/admin/problems": "Problems",
    "/admin/roles": "Roles & Permissions",
    "/admin/settings": "Settings",
}

// Create the context
interface TitleContextType {
    title: string
    setTitle: (title: string) => void
}

const TitleContext = createContext<TitleContextType | undefined>(undefined)

// Provider component with automatic path-based title updates
export function TitleProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState("Dashboard")
    const pathname = usePathname()

    // Update title based on current path
    useEffect(() => {
        if (pathname && routeTitles[pathname]) {
            setTitle(routeTitles[pathname])
        } else {
            // Handle subpaths or unknown paths
            const baseRoute = Object.keys(routeTitles).find(route =>
                pathname?.startsWith(route) && route !== "/admin/dashboard"
            )

            if (baseRoute) {
                setTitle(routeTitles[baseRoute])
            } else if (pathname?.startsWith("/admin")) {
                setTitle("Dashboard") // Default fallback for admin routes
            }
        }
    }, [pathname])

    // Update document title whenever the title in context changes
    useEffect(() => {
        if (title) {
            document.title = `Dalatix | ${title}`
        }
    }, [title])

    return (
        <TitleContext.Provider value={{ title, setTitle }}>
            {children}
        </TitleContext.Provider>
    )
}

// Hook to use the title context
export function useTitle() {
    const context = useContext(TitleContext)
    if (context === undefined) {
        throw new Error("useTitle must be used within a TitleProvider")
    }
    return context
}