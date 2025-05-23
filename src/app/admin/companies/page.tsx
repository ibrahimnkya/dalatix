"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompaniesTable } from "@/components/companies/CompaniesTable"
import { useQuery } from "@tanstack/react-query"
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany as deleteCompanyService,
} from "@/lib/services/company"
import { Card } from "@/components/ui/card"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CompanyForm } from "@/components/companies/company-form"
import { Alert } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function CompaniesPage() {
  const {
    data: response,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: () => getCompanies({ paginate: true }),
  })
  const companies = response?.data?.data || []

  // Stats calculation
  const totalCompanies = companies.length
  const totalActive = companies.filter((c: any) => c.is_active).length
  const totalInactive = companies.filter((c: any) => !c.is_active).length

  // Modal state
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editCompany, setEditCompany] = useState<any>(null)
  const [companyToDelete, setCompanyToDelete] = useState<any>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [viewCompany, setViewCompany] = useState<any>(null)

  // Filter companies by search
  const filteredCompanies = companies.filter((c: any) => {
    const q = search.toLowerCase()
    return (
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone_number?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    )
  })

  const handleAddCompany = async (data: any) => {
    setIsSubmitting(true)
    try {
      await createCompany(data)
      setOpen(false)
      refetch()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (company: any) => {
    setEditCompany(company)
    setOpen(true)
  }

  const handleDelete = (company: any) => {
    setCompanyToDelete(company)
  }

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      if (editCompany) {
        await updateCompany(editCompany.id, data)
      } else {
        await createCompany(data)
      }
      setOpen(false)
      setEditCompany(null)
      refetch()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true)
    setDeleteError(null)
    try {
      await deleteCompanyService(companyToDelete.id)
      setCompanyToDelete(null)
      refetch()
    } catch (e: any) {
      setDeleteError("Failed to delete company.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-secondary">Companies</h1>
          <Button className="bg-primary hover:bg-primary/90 text-secondary font-semibold" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Input
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
          />
        </div>
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="p-4 text-center">
              <div className="text-lg font-semibold">Total Companies</div>
              <div className="text-2xl font-bold">{totalCompanies}</div>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="p-4 text-center">
              <div className="text-lg font-semibold">Active Companies</div>
              <div className="text-2xl font-bold text-green-600">{totalActive}</div>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="p-4 text-center">
              <div className="text-lg font-semibold">Inactive Companies</div>
              <div className="text-2xl font-bold text-red-600">{totalInactive}</div>
            </Card>
          </motion.div>
        </div>
        <Card className="p-6">
          {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="lg" />
              </div>
          ) : (
              <CompaniesTable
                  data={filteredCompanies}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={setViewCompany}
              />
          )}
        </Card>
        {/* Add/Edit Company Modal */}
        <AnimatePresence>
          {open && (
              <Dialog
                  open={open}
                  onOpenChange={(v) => {
                    setOpen(v)
                    if (!v) setEditCompany(null)
                  }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editCompany ? "Edit Company" : "Add Company"}</DialogTitle>
                    <DialogDescription>Fill in the company details below.</DialogDescription>
                  </DialogHeader>
                  <CompanyForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} initialData={editCompany} />
                </DialogContent>
              </Dialog>
          )}
        </AnimatePresence>
        {/* View Company Modal */}
        <AnimatePresence>
          {viewCompany && (
              <Dialog
                  open={!!viewCompany}
                  onOpenChange={(v) => {
                    if (!v) setViewCompany(null)
                  }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Company Details</DialogTitle>
                  </DialogHeader>
                  <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                  >
                    <div>
                      <b>Name:</b> {viewCompany.name}
                    </div>
                    <div>
                      <b>Address:</b> {viewCompany.address}
                    </div>
                    <div>
                      <b>Phone:</b> {viewCompany.phone_number}
                    </div>
                    <div>
                      <b>Email:</b> {viewCompany.email}
                    </div>
                    <div>
                      <b>Website:</b> {viewCompany.website_url || "-"}
                    </div>
                    <div>
                      <b>Status:</b>{" "}
                      <span className={viewCompany.is_active ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {viewCompany.is_active ? "Active" : "Inactive"}
                  </span>
                    </div>
                  </motion.div>
                </DialogContent>
              </Dialog>
          )}
        </AnimatePresence>
        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {companyToDelete && (
              <Dialog
                  open={!!companyToDelete}
                  onOpenChange={(v) => {
                    if (!v) setCompanyToDelete(null)
                  }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Company</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete <b>{companyToDelete?.name}</b>? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  {deleteError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Alert variant="destructive">{deleteError}</Alert>
                      </motion.div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCompanyToDelete(null)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
                      {isSubmitting ? (
                          <>
                            <LoadingSpinner className="mr-2" size="sm" />
                            Deleting...
                          </>
                      ) : (
                          "Delete"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          )}
        </AnimatePresence>
      </motion.div>
  )
}
