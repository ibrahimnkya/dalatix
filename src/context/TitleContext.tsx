"use client"
import { createContext, useContext, useState, type ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"

// Define route title mapping
export const routeTitles: Record<string, string> = {
    // Admin routes
    "/admin/dashboard": "Admin Portal - Dashboard",
    "/admin/companies": "Admin Portal - Companies",
    "/admin/users": "Admin Portal - Users",
    "/admin/vehicles": "Admin Portal - Vehicles",
    "/admin/bus-stops": "Admin Portal - Bus Stops",
    "/admin/routes": "Admin Portal - Routes",
    "/admin/bookings": "Admin Portal - Bookings",
    "/admin/devices": "Admin Portal - Devices",
    "/admin/problems": "Admin Portal - Problems",
    "/admin/roles": "Admin Portal - Roles & Permissions",
    "/admin/settings": "Admin Portal - Settings",

    // Bus Owner routes
    "/bus-owner/dashboard": "Bus Owner Portal - Dashboard",
    "/bus-owner/vehicles": "Bus Owner Portal - Vehicles",
    "/bus-owner/bookings": "Bus Owner Portal - Bookings",
    "/bus-owner/devices": "Bus Owner Portal - Devices",
    "/bus-owner/bus-stops": "Bus Owner Portal - Bus Stops",
    "/bus-owner/routes": "Bus Owner Portal - Routes",
    "/bus-owner/settings": "Bus Owner Portal - Settings",

    // Auth routes
    "/": "Login",
    "/login": "Login",
    "/register": "Register",
    "/forgot-password": "Forgot Password",
}

// Create the context
interface TitleContextType {
    title: string
    setTitle: (title: string) => void
}

const TitleContext = createContext<TitleContextType | undefined>(undefined)

// Provider component with automatic path-based title updates
export function TitleProvider({ children }: { children: ReactNode }) {
    const [title, setTitle] = useState("Dalatix")
    const pathname = usePathname()

    // Update title based on current path
    useEffect(() => {
        if (pathname && routeTitles[pathname]) {
            setTitle(routeTitles[pathname])
        } else {
            // Handle subpaths or unknown paths
            const baseRoute = Object.keys(routeTitles).find(
                (route) => pathname?.startsWith(route) && route !== "/admin/dashboard" && route !== "/bus-owner/dashboard",
            )

            if (baseRoute) {
                setTitle(routeTitles[baseRoute])
            } else if (pathname?.startsWith("/admin")) {
                setTitle("Admin Portal - Dashboard") // Default fallback for admin routes
            } else if (pathname?.startsWith("/bus-owner")) {
                setTitle("Bus Owner Portal - Dashboard") // Default fallback for bus-owner routes
            } else {
                setTitle("Dalatix") // Default fallback
            }
        }
    }, [pathname])

    // Update document title whenever the title in context changes
    useEffect(() => {
        if (title) {
            document.title = `${title} | Dalatix`
        }
    }, [title])

    return <TitleContext.Provider value={{ title, setTitle }}>{children}</TitleContext.Provider>
}

// Hook to use the title context
export function useTitle() {
    const context = useContext(TitleContext)
    if (context === undefined) {
        throw new Error("useTitle must be used within a TitleProvider")
    }
    return context
}
