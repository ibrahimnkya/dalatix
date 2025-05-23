"use client"

import type React from "react"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Button } from "@/components/ui/button"
import { Bell, HelpCircle, Mail, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
                            {/* Display the dynamic title here */}
                            <span>{title}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="relative hidden md:flex">
                                <Mail className="h-5 w-5" />
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                    3
                                </Badge>
                            </Button>

                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5" />
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                    5
                                </Badge>
                            </Button>

                            <Button variant="ghost" size="icon" className="hidden md:flex">
                                <HelpCircle className="h-5 w-5" />
                            </Button>

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