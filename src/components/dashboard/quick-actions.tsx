"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {Plus, FileText, Users, Settings, Truck, Building} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"
import { motion } from "framer-motion"

export function QuickActions() {
    const router = useRouter()
    const isMobile = useMobile()

    const actions = [
        {
            title: "Companies",
            icon: <Building className="h-4 w-4" />,
            onClick: () => router.push("/admin/companies/"),
        },
        {
            title: "View Reports",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => router.push("/admin/reports"),
        },
        {
            title: "Manage Users",
            icon: <Users className="h-4 w-4" />,
            onClick: () => router.push("/admin/users"),
        },
        {
            title: "Vehicle Status",
            icon: <Truck className="h-4 w-4" />,
            onClick: () => router.push("/admin/vehicles"),
        },
        {
            title: "Settings",
            icon: <Settings className="h-4 w-4" />,
            onClick: () => router.push("/admin/settings"),
        },
    ]

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                    {actions.map((action, index) => (
                        <motion.div
                            key={action.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            className="flex-1 min-w-[120px]"
                        >
                            <Button
                                variant="outline"
                                size={isMobile ? "sm" : "default"}
                                className="w-full justify-start"
                                onClick={action.onClick}
                            >
                                {action.icon}
                                <span className="ml-2">{action.title}</span>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
