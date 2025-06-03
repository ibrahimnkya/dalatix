"use client"

import type React from "react"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserNav } from "@/components/dashboard/user-nav"
import { Toaster } from "@/components/ui/toaster"
import { TitleProvider, useTitle } from "@/context/TitleContext"

// Inner component that uses the title context
function AdminLayoutInner({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { title } = useTitle()

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
                    <AdminSidebar onClose={() => setSidebarOpen(false)} isMobile={true} />
                </div>
            ) : (
                <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
                    <AdminSidebar />
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
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <TitleProvider>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </TitleProvider>
    )
}
