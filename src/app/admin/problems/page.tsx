"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/page-header"
import { TableFilters } from "@/components/table-filters"
import { TablePagination } from "@/components/table-pagination"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner } from "@/components/loading-spinner"
import {
    Plus,
    Download,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Edit,
    Trash2,
    UserPlus,
} from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
    getProblems,
    getProblem,
    createProblem,
    updateProblemStatus,
    assignProblem,
    deleteProblem,
} from "@/lib/services/problem"
import { getUsers } from "@/lib/services/user"
import type { Problem, CreateProblemData, UpdateProblemStatusData, AssignProblemData } from "@/types/problem"

export default function ProblemsPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [searchTerm, setSearchTerm] = useState("")
    const [filters, setFilters] = useState<Record<string, any>>({})

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
    const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)

    // Form states
    const [newProblemDescription, setNewProblemDescription] = useState("")
    const [newStatus, setNewStatus] = useState<string>("")
    const [assigneeId, setAssigneeId] = useState<number | null>(null)

    // Fetch problems
    const {
        data: problemsData,
        isLoading: isLoadingProblems,
        isError: isErrorProblems,
        refetch: refetchProblems,
    } = useQuery({
        queryKey: ["problems", currentPage, pageSize, searchTerm, filters],
        queryFn: () =>
            getProblems({
                page: currentPage,
                per_page: pageSize,
                status: filters.status,
                paginate: true,
            }),
    })

    // Fetch users for assignee selection
    const { data: usersData, isLoading: isLoadingUsers } = useQuery({
        queryKey: ["users-for-problems"],
        queryFn: () =>
            getUsers({
                paginate: false,
                roles: ["Administrator", "Admin", "Support", "Operations"],
            }),
    })

    // Fetch single problem details
    const {
        data: problemDetails,
        isLoading: isLoadingProblemDetails,
        refetch: refetchProblemDetails,
    } = useQuery({
        queryKey: ["problem", selectedProblem?.id],
        queryFn: () => (selectedProblem?.id ? getProblem(selectedProblem.id) : null),
        enabled: !!selectedProblem?.id && isViewDialogOpen,
    })

    // Create problem mutation
    const createProblemMutation = useMutation({
        mutationFn: (data: CreateProblemData) => createProblem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] })
            toast({
                title: "Problem reported",
                description: "The problem has been reported successfully.",
            })
            setIsCreateDialogOpen(false)
            setNewProblemDescription("")
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to report problem. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Update problem status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateProblemStatusData }) => updateProblemStatus(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] })
            queryClient.invalidateQueries({ queryKey: ["problem", selectedProblem?.id] })
            toast({
                title: "Status updated",
                description: "The problem status has been updated successfully.",
            })
            setIsStatusDialogOpen(false)
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update status. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Assign problem mutation
    const assignProblemMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: AssignProblemData }) => assignProblem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] })
            queryClient.invalidateQueries({ queryKey: ["problem", selectedProblem?.id] })
            toast({
                title: "Problem assigned",
                description: "The problem has been assigned successfully.",
            })
            setIsAssignDialogOpen(false)
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to assign problem. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Delete problem mutation
    const deleteProblemMutation = useMutation({
        mutationFn: (id: number) => deleteProblem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] })
            toast({
                title: "Problem deleted",
                description: "The problem has been deleted successfully.",
            })
            setIsDeleteDialogOpen(false)
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete problem. Please try again.",
                variant: "destructive",
            })
        },
    })

    // Extract problems and pagination data
    const problems = problemsData?.data?.data || []
    const totalPages = problemsData?.data?.last_page || 1
    const totalItems = problemsData?.data?.total || 0

    // Extract users for assignee selection
    const users = usersData?.data?.data || []

    // Calculate stats
    const stats = {
        total: totalItems,
        open: problems.filter((p) => p.status === "open").length,
        inProgress: problems.filter((p) => p.status === "in_progress").length,
        resolved: problems.filter((p) => p.status === "resolved").length,
        closed: problems.filter((p) => p.status === "closed").length,
    }

    const handleSearch = (term: string) => {
        setSearchTerm(term)
        setCurrentPage(1)
    }

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters)
        setCurrentPage(1)
    }

    const handleCreateProblem = () => {
        if (!newProblemDescription.trim()) {
            toast({
                title: "Validation Error",
                description: "Please provide a problem description.",
                variant: "destructive",
            })
            return
        }

        // In a real app, you would get the current user's ID
        // For now, we'll use a placeholder ID
        const currentUserId = 1 // Replace with actual user ID from auth context

        createProblemMutation.mutate({
            description: newProblemDescription,
            reporter_id: currentUserId,
            status: "open",
        })
    }

    const handleUpdateStatus = () => {
        if (!selectedProblem || !newStatus) {
            toast({
                title: "Validation Error",
                description: "Please select a status.",
                variant: "destructive",
            })
            return
        }

        updateStatusMutation.mutate({
            id: selectedProblem.id,
            data: { status: newStatus as any },
        })
    }

    const handleAssignProblem = () => {
        if (!selectedProblem || !assigneeId) {
            toast({
                title: "Validation Error",
                description: "Please select an assignee.",
                variant: "destructive",
            })
            return
        }

        assignProblemMutation.mutate({
            id: selectedProblem.id,
            data: { assignee_id: assigneeId },
        })
    }

    const handleDeleteProblem = () => {
        if (!selectedProblem) return

        deleteProblemMutation.mutate(selectedProblem.id)
    }

    const openViewDialog = (problem: Problem) => {
        setSelectedProblem(problem)
        setIsViewDialogOpen(true)
    }

    const openStatusDialog = (problem: Problem) => {
        setSelectedProblem(problem)
        setNewStatus(problem.status)
        setIsStatusDialogOpen(true)
    }

    const openAssignDialog = (problem: Problem) => {
        setSelectedProblem(problem)
        setAssigneeId(problem.assignee_id || null)
        setIsAssignDialogOpen(true)
    }

    const openDeleteDialog = (problem: Problem) => {
        setSelectedProblem(problem)
        setIsDeleteDialogOpen(true)
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "open":
                return <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />
            case "in_progress":
                return <Clock className="h-4 w-4 mr-1 text-yellow-500" />
            case "resolved":
                return <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
            case "closed":
                return <XCircle className="h-4 w-4 mr-1 text-gray-500" />
            default:
                return <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "open":
                return "bg-red-100 text-red-800"
            case "in_progress":
                return "bg-yellow-100 text-yellow-800"
            case "resolved":
                return "bg-green-100 text-green-800"
            case "closed":
                return "bg-gray-100 text-gray-800"
            default:
                return "bg-red-100 text-red-800"
        }
    }

    const filterOptions = [
        {
            id: "status",
            label: "Status",
            type: "select",
            options: [
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
            ],
        },
    ]

    const problemsDataExists = problemsData?.data?.data !== undefined

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Problems Management"
                description="Track and resolve reported issues in the system"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetchProblems()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Report Problem
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All reported issues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Open</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                            <div className="text-2xl font-bold">{stats.open}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Awaiting action</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                            <div className="text-2xl font-bold">{stats.inProgress}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Currently being addressed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            <div className="text-2xl font-bold">{stats.resolved}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Successfully fixed</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Closed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                            <div className="text-2xl font-bold">{stats.closed}</div>
                        </div>
                        <p className="text-xs text-muted-foreground">Permanently closed</p>
                    </CardContent>
                </Card>
            </div>

            <TableFilters
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                filterOptions={filterOptions}
                searchPlaceholder="Search problems..."
            />

            {isLoadingProblems ? (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="lg" />
                </div>
            ) : isErrorProblems ? (
                <div className="flex justify-center items-center h-64 text-red-500">
                    Error loading problems. Please try again.
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg shadow overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Problem</TableHead>
                                    <TableHead>Reported By</TableHead>
                                    <TableHead>Assigned To</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {problems.length === 0 && problemsDataExists ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            No problems found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    problems.map((problem: Problem) => (
                                        <TableRow key={problem.id}>
                                            <TableCell>{problem.id}</TableCell>
                                            <TableCell className="font-medium">
                                                {problem.description.length > 50
                                                    ? `${problem.description.substring(0, 50)}...`
                                                    : problem.description}
                                            </TableCell>
                                            <TableCell>
                                                {problem.reporter ? `${problem.reporter.first_name} ${problem.reporter.last_name}` : "Unknown"}
                                            </TableCell>
                                            <TableCell>
                                                {problem.assignee
                                                    ? `${problem.assignee.first_name} ${problem.assignee.last_name}`
                                                    : "Unassigned"}
                                            </TableCell>
                                            <TableCell>{new Date(problem.created_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    {getStatusIcon(problem.status)}
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(problem.status)}`}
                                                    >
                            {problem.status.charAt(0).toUpperCase() + problem.status.slice(1).replace("_", " ")}
                          </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openViewDialog(problem)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {problem.status !== "closed" && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openStatusDialog(problem)}
                                                                title="Update Status"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openAssignDialog(problem)}
                                                                title="Assign Problem"
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(problem)}
                                                        className="text-red-500 hover:text-red-700"
                                                        title="Delete Problem"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={setPageSize}
                        totalItems={totalItems}
                    />
                </motion.div>
            )}

            {/* Create Problem Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Report New Problem</DialogTitle>
                        <DialogDescription>Describe the issue you're experiencing in detail.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="description">Problem Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the problem in detail..."
                                value={newProblemDescription}
                                onChange={(e) => setNewProblemDescription(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateProblem} disabled={createProblemMutation.isPending}>
                            {createProblemMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Problem"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Problem Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Problem Details</DialogTitle>
                        <DialogDescription>Detailed information about the selected problem.</DialogDescription>
                    </DialogHeader>
                    {isLoadingProblemDetails ? (
                        <div className="py-6 flex justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : problemDetails?.data ? (
                        <div className="space-y-4 py-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Problem ID</h3>
                                <p className="mt-1">{problemDetails.data.id}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                                <p className="mt-1">{problemDetails.data.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                                    <div className="flex items-center mt-1">
                                        {getStatusIcon(problemDetails.data.status)}
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                problemDetails.data.status,
                                            )}`}
                                        >
                      {problemDetails.data.status.charAt(0).toUpperCase() +
                          problemDetails.data.status.slice(1).replace("_", " ")}
                    </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Reported By</h3>
                                    <p className="mt-1">
                                        {problemDetails.data.reporter
                                            ? `${problemDetails.data.reporter.first_name} ${problemDetails.data.reporter.last_name}`
                                            : "Unknown"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
                                    <p className="mt-1">
                                        {problemDetails.data.assignee
                                            ? `${problemDetails.data.assignee.first_name} ${problemDetails.data.assignee.last_name}`
                                            : "Unassigned"}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                                    <p className="mt-1">{new Date(problemDetails.data.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                                <p className="mt-1">{new Date(problemDetails.data.updated_at).toLocaleString()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center text-gray-500">Problem details not available</div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Status Dialog */}
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Update Problem Status</DialogTitle>
                        <DialogDescription>Change the status of this problem.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Updating...
                                </>
                            ) : (
                                "Update Status"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Problem Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Assign Problem</DialogTitle>
                        <DialogDescription>Assign this problem to a user.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="assignee">Assignee</Label>
                            <Select value={assigneeId?.toString() || ""} onValueChange={(value) => setAssigneeId(Number(value))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isLoadingUsers ? (
                                        <div className="p-2 text-center">Loading users...</div>
                                    ) : (
                                        users.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.first_name} {user.last_name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAssignProblem} disabled={assignProblemMutation.isPending}>
                            {assignProblemMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Assigning...
                                </>
                            ) : (
                                "Assign Problem"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this problem. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProblem}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deleteProblemMutation.isPending}
                        >
                            {deleteProblemMutation.isPending ? (
                                <>
                                    <LoadingSpinner className="mr-2" size="sm" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
