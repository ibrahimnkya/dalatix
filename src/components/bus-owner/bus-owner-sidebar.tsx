"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LogOut,
    MapPin,
    Package,
    Settings,
    Smartphone,
    Ticket,
    Bus,
    X,
    Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useIsMobile } from "@/hooks/use-mobile"
import { logout } from "@/lib/auth"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { usePermissions } from "@/hooks/use-permissions"

interface NavItem {
    title: string
    href: string
    icon: React.ElementType
}

const busOwnerNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/bus-owner/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "My Vehicles",
        href: "/bus-owner/vehicles",
        icon: Bus,
    },
    {
        title: "Routes",
        href: "/bus-owner/routes",
        icon: Route,
    },
    {
        title: "Bus Stops",
        href: "/bus-owner/bus-stops",
        icon: MapPin,
    },
    {
        title: "Bookings",
        href: "/bus-owner/bookings",
        icon: Ticket,
    },
    {
        title: "Devices",
        href: "/bus-owner/devices",
        icon: Smartphone,
    },
    // {
    //     title: "Settings",
    //     href: "/bus-owner/settings",
    //     icon: Settings,
    // },
]

interface BusOwnerSidebarProps {
    onClose?: () => void
    isMobile?: boolean
}

export function BusOwnerSidebar({ onClose, isMobile: forceMobile }: BusOwnerSidebarProps) {
    const isMobile = useIsMobile()
    const pathname = usePathname()
    const [expanded, setExpanded] = React.useState(true)
    const { companyId } = usePermissions()

    // Check if a path is active
    const isPathActive = (href: string) => {
        if (pathname === href) return true
        if (href !== "/bus-owner/dashboard" && pathname?.startsWith(href)) return true
        return false
    }

    // Close sidebar on mobile by default
    React.useEffect(() => {
        if (isMobile) {
            setExpanded(true) // Always expanded on mobile for better visibility
        } else {
            setExpanded(true) // Default to expanded on desktop
        }
    }, [isMobile])

    const handleLogout = () => {
        logout()
    }

    const handleLinkClick = () => {
        if (isMobile && onClose) {
            onClose()
        }
    }

    return (
        <aside className={cn("h-full bg-background border-r", isMobile ? "w-full" : expanded ? "w-64" : "w-[70px]")}>
            <div className="flex h-16 items-center justify-between border-b px-4">
                {expanded || isMobile ? (
                    <>
                        <Link href="/bus-owner/dashboard" className="flex items-center gap-2 font-semibold">
                            <Package className="h-5 w-5 text-primary" />
                            <span>Bus Owner Portal</span>
                        </Link>
                        {isMobile && onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="flex w-full justify-center">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                )}
            </div>

            {!isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
            )}

            <div className="flex flex-col h-[calc(100%-4rem)]">
                {/* User Role Indicator */}
                {/*{(expanded || isMobile) && (*/}
                {/*    <div className="px-4 py-3 border-b bg-blue-50 dark:bg-blue-950/20">*/}
                {/*        <div className="flex items-center gap-2">*/}
                {/*            <Building2 className="h-4 w-4 text-blue-600" />*/}
                {/*            <div>*/}
                {/*                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Bus Owner Account</div>*/}
                {/*                {companyId && <div className="text-xs text-blue-700 dark:text-blue-300">Company ID: {companyId}</div>}*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*)}*/}

                <nav className="flex-1 overflow-y-auto py-6 px-3">
                    <TooltipProvider delayDuration={0}>
                        <div className="space-y-2">
                            {busOwnerNavItems.map((item) => {
                                const isItemActive = isPathActive(item.href)

                                return expanded || isMobile ? (
                                    <Link
                                        key={item.title}
                                        href={item.href}
                                        onClick={handleLinkClick}
                                        className={cn(
                                            "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                                            isItemActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.title}</span>
                                    </Link>
                                ) : (
                                    <Tooltip key={item.title}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={item.href}
                                                onClick={handleLinkClick}
                                                className={cn(
                                                    "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                                                    isItemActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
                                                )}
                                            >
                                                <item.icon className="h-5 w-5" />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="font-normal">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    </TooltipProvider>
                </nav>

                <div className={cn("mt-auto border-t p-4", !expanded && !isMobile && "flex flex-col items-center p-2")}>
                    {expanded || isMobile ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs text-muted-foreground">Theme</span>
                                <ThemeToggle />
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive py-3"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Logout</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <ThemeToggle className="mb-2" />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Logout</TooltipContent>
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>
        </aside>
    )
}
