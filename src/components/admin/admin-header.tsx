"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Bell, Search, User, Settings, LogOut, HelpCircle, ChevronRight, Package } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { logout } from "@/lib/auth"
import { useMobile } from "@/hooks/use-mobile"

export function AdminHeader() {
    const pathname = usePathname()
    const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href: string }[]>([])
    const [notifications, setNotifications] = useState<{ id: number; title: string; message: string; read: boolean }[]>([
        { id: 1, title: "New booking", message: "A new booking has been made", read: false },
        { id: 2, title: "System update", message: "System will be updated tonight", read: false },
        { id: 3, title: "Payment received", message: "Payment for booking #1234 received", read: true },
    ])
    const isMobile = useMobile()

    useEffect(() => {
        if (pathname) {
            const segments = pathname.split('/').filter(Boolean)
            const crumbs = segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join('/')}`
                return {
                    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
                    href,
                }
            })
            setBreadcrumbs([{ label: 'Home', href: '/' }, ...crumbs])
        }
    }, [pathname])

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })))
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            {isMobile && (
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold mr-4">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="sr-only md:not-sr-only">Dalatix Admin</span>
                </Link>
            )}

            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center">
                        {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                        <Link
                            href={crumb.href}
                            className={cn(
                                "hover:text-foreground transition-colors",
                                index === breadcrumbs.length - 1 ? "font-medium text-foreground" : ""
                            )}
                        >
                            {crumb.label}
                        </Link>
                    </div>
                ))}
            </div>

            <div className="ml-auto flex items-center gap-4">
                <form className="hidden md:flex">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            className="w-64 pl-8 rounded-full bg-muted"
                        />
                    </div>
                </form>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                                >
                                    {unreadCount}
                                </motion.div>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="flex items-center justify-between">
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto text-xs px-2">
                                    Mark all as read
                                </Button>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {notifications.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-4 cursor-pointer">
                                    <div className="flex w-full justify-between">
                                        <span className="font-medium">{notification.title}</span>
                                        {!notification.read && (
                                            <Badge variant="default" className="ml-auto h-auto text-[10px] px-1 py-0">
                                                New
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-sm text-muted-foreground mt-1">{notification.message}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="/avatars/01.png" alt="User" />
                                <AvatarFallback>AD</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            <span>Help</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
