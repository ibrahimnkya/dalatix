"use client"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { useIsMobile } from "@/hooks/use-mobile"

const tickets = [
    {
        id: "TCK-001",
        subject: "Device not reporting",
        status: "Open",
        created: "2025-05-08",
    },
    {
        id: "TCK-002",
        subject: "Vehicle offline",
        status: "In Progress",
        created: "2025-05-07",
    },
    {
        id: "TCK-003",
        subject: "Company registration issue",
        status: "Closed",
        created: "2025-05-06",
    },
    {
        id: "TCK-004",
        subject: "User access problem",
        status: "Open",
        created: "2025-05-05",
    },
]

export function RecentTickets() {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <div className="space-y-4">
                {tickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-md p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">{ticket.id}</span>
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">{ticket.status}</span>
                        </div>
                        <p className="text-sm mb-1">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.created}</p>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                        <TableCell>{ticket.id}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>{ticket.status}</TableCell>
                        <TableCell>{ticket.created}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
