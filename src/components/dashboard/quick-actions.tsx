"use client"

import { Car, Calendar, Route, MapPin, Smartphone, Users, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { motion } from "framer-motion"

interface QuickActionsProps {
    isBusOwner?: boolean
    companyId?: number | null
}

export function QuickActions({ isBusOwner = false, companyId }: QuickActionsProps) {
    // Filter actions based on role
    const getAvailableActions = () => {
        if (isBusOwner) {
            // Bus owners get limited actions
            return [
                {
                    title: "View My Vehicles",
                    description: "Manage your company vehicles",
                    icon: Car,
                    href: "/vehicles",
                    color: "bg-blue-500",
                },
                {
                    title: "View Bookings",
                    description: "Check recent bookings",
                    icon: Calendar,
                    href: "/bookings",
                    color: "bg-green-500",
                },
                {
                    title: "View Routes",
                    description: "Check available routes",
                    icon: Route,
                    href: "/routes",
                    color: "bg-purple-500",
                },
                {
                    title: "My Devices",
                    description: "Monitor your devices",
                    icon: Smartphone,
                    href: "/devices",
                    color: "bg-orange-500",
                },
            ]
        }

        // Full admin actions
        return [
            {
                title: "Add Vehicle",
                description: "Register a new vehicle",
                icon: Car,
                href: "/vehicles?action=add",
                color: "bg-blue-500",
            },
            {
                title: "Create Booking",
                description: "Book a new trip",
                icon: Calendar,
                href: "/bookings?action=add",
                color: "bg-green-500",
            },
            {
                title: "Add Route",
                description: "Create new route",
                icon: Route,
                href: "/routes?action=add",
                color: "bg-purple-500",
            },
            {
                title: "Add Bus Stop",
                description: "Register new bus stop",
                icon: MapPin,
                href: "/bus-stops?action=add",
                color: "bg-red-500",
            },
            {
                title: "Add Device",
                description: "Register new device",
                icon: Smartphone,
                href: "/devices?action=add",
                color: "bg-orange-500",
            },
            {
                title: "Manage Users",
                description: "User management",
                icon: Users,
                href: "/roles",
                color: "bg-indigo-500",
            },
        ]
    }

    const actions = getAvailableActions()

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                    {isBusOwner && <Badge variant="secondary">Bus Owner</Badge>}
                </CardTitle>
                <CardDescription>
                    {isBusOwner ? "Quick access to your company resources" : "Frequently used actions and shortcuts"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {actions.map((action, index) => (
                        <Link key={action.title} href={action.href}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="group cursor-pointer"
                            >
                                <div className="flex flex-col items-center p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                                    <div
                                        className={`p-3 rounded-full ${action.color} text-white mb-3 group-hover:scale-110 transition-transform duration-200`}
                                    >
                                        <action.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-medium text-sm text-center mb-1">{action.title}</h3>
                                    <p className="text-xs text-muted-foreground text-center">{action.description}</p>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
