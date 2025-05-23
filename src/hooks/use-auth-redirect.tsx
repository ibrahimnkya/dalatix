"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export function useAuthRedirect() {
    const router = useRouter()
    const pathname = usePathname()
    const [isRedirecting, setIsRedirecting] = useState(false)

    // Function to handle logout
    const handleLogout = () => {
        if (isRedirecting) return // Prevent multiple redirects

        try {
            // Clear authentication data
            localStorage.removeItem("token")
            localStorage.removeItem("user")

            // Set cookie expiration to past date to remove it
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

            setIsRedirecting(true)

            // Redirect to login page
            if (!pathname.includes("/login")) {
                router.push("/login")
            }
        } catch (error) {
            console.error("Error during logout:", error)
        }
    }

    return { handleLogout }
}
