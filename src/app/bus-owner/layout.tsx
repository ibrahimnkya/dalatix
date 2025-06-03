"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { BusOwnerSidebar } from "@/components/bus-owner/bus-owner-sidebar"
import { Button } from "@/components/ui/button"
import { Bell, HelpCircle, Mail, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { UserNav } from "@/components/dashboard/user-nav"
import { Toaster } from "@/components/ui/toaster"
import { TitleProvider, useTitle } from "@/context/TitleContext"
import { usePermissions } from "@/hooks/use-permissions"
import { useRouter } from "next/navigation"

// Inner component that uses the title context
function BusOwnerLayoutInner({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { title } = useTitle()
    const { hasRole } = usePermissions()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    // Check if user is a bus owner
    const isBusOwner = hasRole("Bus Owner")

    useEffect(() => {
        // Give some time for permissions to load from localStorage
        const timer = setTimeout(() => {
            setIsLoading(false)

            // Redirect non-bus owners to admin portal
            if (!isBusOwner) {
                console.log("Non-bus owner detected in bus owner layout, redirecting to admin portal")
                router.push("/admin/dashboard")
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [isBusOwner, router])

    // Show loading while permissions are being checked
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading permissions...</p>
                </div>
            </div>
        )
    }

    // Don't render anything if not a bus owner (will redirect)
    if (!isBusOwner) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Redirecting to Admin Portal...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-background">
            {/* Mobile sidebar backdrop */}
            {isMobile && sidebarOpen && (
                <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Mobile sidebar */}
            {isMobile ? (
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <BusOwnerSidebar onClose={() => setSidebarOpen(false)} isMobile={true} />
                </div>
            ) : (
                <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
                    <BusOwnerSidebar />
                </div>
            )}

            {/* Main content */}
            <div className="flex h-full flex-col lg:pl-64">
                {/* Header - fixed for all devices */}
                <header className="fixed top-0 right-0 left-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:left-64">
                    {isMobile && (
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    )}

                    <div className="flex flex-1 items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                            {/* Display the dynamic title here */}
                            <span>{title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                        <UserNav />
                        </div>
                    </div>
                </header>

                {/* Page content - with padding to account for fixed header */}
                <main className="flex-1 overflow-y-auto pt-16">
                    <div className="container mx-auto p-4 md:p-6">{children}</div>
                </main>
            </div>
            <Toaster />
        </div>
    )
}

// Wrapper component that provides the TitleContext
export default function BusOwnerLayout({ children }: { children: React.ReactNode }) {
    return (
        <TitleProvider>
            <BusOwnerLayoutInner>{children}</BusOwnerLayoutInner>
        </TitleProvider>
    )
}
