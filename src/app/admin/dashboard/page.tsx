"use client"

import { useEffect, useState } from "react"
import { Calendar, Car, Download, LineChart, Loader2, Wallet, ChevronDown, FileText, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { useMobile } from "@/hooks/use-mobile"
import { usePermissions } from "@/hooks/use-permissions"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { motion } from "framer-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { DateRange } from "react-day-picker"
import type { DashboardStats, Company, ExportFormat } from "@/types/dashboard"
import {
  getCompanies,
  getDashboardStats,
  getDefaultDateRange,
  setupTokenValidation,
  exportDashboardData,
  getCompany,
} from "@/lib/services/dashboard"
import { RevenueDistribution } from "@/components/dashboard/revenue-distribution"

export default function DashboardPage() {
  const isMobile = useMobile()
  const { toast } = useToast()
  const { hasRole, companyId } = usePermissions()

  // Add this debug log
  useEffect(() => {
    console.log("Dashboard Debug Info:", {
      isBusOwner: hasRole("Bus Owner"),
      companyId,
      userType: typeof window !== "undefined" ? localStorage.getItem("user_type") : null,
    })
  }, [hasRole, companyId])

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string>(
      hasRole("Bus Owner") && companyId ? companyId.toString() : "all",
  )
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Set up token validation
  useEffect(() => {
    const cleanup = setupTokenValidation()
    return cleanup
  }, [])

  // Fetch current company details for bus owners
  useEffect(() => {
    if (hasRole("Bus Owner") && companyId) {
      const fetchCompanyDetails = async () => {
        setLoadingCompany(true)
        try {
          const response = await getCompany(companyId)
          if (response.success) {
            setCurrentCompany(response.data)
          }
        } catch (err) {
          console.error("Error fetching company details:", err)
          toast({
            title: "Warning",
            description: "Could not load company details.",
            variant: "destructive",
          })
        } finally {
          setLoadingCompany(false)
        }
      }

      fetchCompanyDetails()
    }
  }, [hasRole, companyId, toast])

  // Fetch companies (only if not bus owner)
  useEffect(() => {
    console.log("Checking if should fetch companies:", { isBusOwner: hasRole("Bus Owner") })
    if (!hasRole("Bus Owner")) {
      const fetchCompanies = async () => {
        try {
          console.log("Fetching companies for admin user")
          const response = await getCompanies()
          if (response.success && Array.isArray(response.data)) {
            setCompanies(response.data)
            console.log("Companies loaded:", response.data.length)
          }
        } catch (err) {
          console.error("Error fetching companies:", err)
          toast({
            title: "Error",
            description: "Failed to load companies. Please try again.",
            variant: "destructive",
          })
        }
      }

      fetchCompanies()
    } else {
      console.log("Bus owner detected, skipping companies fetch")
    }
  }, [toast, hasRole])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const startDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
        const endDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""

        // Determine the company filter based on user permissions
        let companyFilter: string | undefined

        if (hasRole("Bus Owner")) {
          // Bus owners are always restricted to their assigned company
          if (companyId) {
            companyFilter = companyId.toString()
            console.log("Bus owner detected, using company ID:", companyFilter)
          } else {
            console.warn("Bus owner detected but no company ID found")
            setError("Bus owner account is not properly configured with a company")
            return
          }
        } else if (!hasRole("Bus Owner") && selectedCompany !== "all") {
          // Admins can select any company or view all
          companyFilter = selectedCompany
          console.log("Admin selected company:", companyFilter)
        } else {
          // View all companies (admin only)
          companyFilter = undefined
          console.log("Viewing all companies data")
        }

        console.log("Fetching dashboard stats with params:", {
          companyFilter,
          startDate,
          endDate,
          isBusOwner: hasRole("Bus Owner"),
          userCompanyId: companyId,
        })

        const response = await getDashboardStats(companyFilter, startDate, endDate)

        if (response.success) {
          setStats(response.data)
          console.log("Dashboard stats loaded successfully:", response.data)
        } else {
          throw new Error(response.message || "Failed to fetch dashboard statistics")
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (dateRange.from && dateRange.to) {
      fetchStats()
    }
  }, [selectedCompany, dateRange, hasRole, companyId])

  const handleDateRangeChange = (range: DateRange) => {
    if (range.from && range.to) {
      setDateRange(range)
    }
  }

  const handleCompanyChange = (value: string) => {
    // Bus owners cannot change company - they're restricted to their assigned company
    if (!hasRole("Bus Owner")) {
      setSelectedCompany(value)
    }
  }

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return

    setIsExporting(true)
    try {
      const startDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
      const endDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""

      if (!startDate || !endDate) {
        throw new Error("Please select a valid date range")
      }

      // Use the same company filtering logic as dashboard stats
      let companyFilter: string | undefined

      if (hasRole("Bus Owner") && companyId) {
        companyFilter = companyId.toString()
      } else if (!hasRole("Bus Owner") && selectedCompany !== "all") {
        companyFilter = selectedCompany
      } else {
        companyFilter = undefined
      }

      console.log("Exporting data with company filter:", companyFilter)

      const blob = await exportDashboardData(format, startDate, endDate, companyFilter)

      if (!blob) {
        throw new Error("Failed to generate export file")
      }

      // Create downloadable link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const companyName =
          hasRole("Bus Owner") && currentCompany
              ? currentCompany.name.toLowerCase().replace(/\s+/g, "-")
              : selectedCompany === "all"
                  ? "all-companies"
                  : companies
                  .find((c) => c.id.toString() === selectedCompany)
                  ?.name?.toLowerCase()
                  .replace(/\s+/g, "-") || "company"

      const fileName = `dalatix-${companyName}-${startDate}-to-${endDate}.${format}`

      link.href = url
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: `Dashboard data exported as ${format.toUpperCase()}`,
      })
    } catch (err) {
      console.error("Error exporting data:", err)
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Failed to export dashboard data",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getSelectedCompanyName = () => {
    if (hasRole("Bus Owner") && currentCompany) {
      return currentCompany.name
    }
    if (selectedCompany === "all") {
      return "All Companies"
    }
    const company = companies.find((c) => c.id.toString() === selectedCompany)
    return company?.name || "Unknown Company"
  }

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background">
        <div className="flex flex-col space-y-4">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">
                {hasRole("Bus Owner") && currentCompany
                    ? `${currentCompany.name} Dashboard`
                    : hasRole("Bus Owner")
                        ? "Bus Owner Dashboard"
                        : "Admin Dashboard"}
              </h2>
              {hasRole("Bus Owner") && currentCompany && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">{currentCompany.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      Bus Owner
                    </Badge>
                  </div>
              )}
              {!hasRole("Bus Owner") && selectedCompany !== "all" && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">{getSelectedCompanyName()}</span>
                  </div>
              )}
            </div>

            {/* Mobile filters toggle */}
            {isMobile && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex justify-between items-center"
                    onClick={() => setShowFilters(!showFilters)}
                >
                  <span>Filters & Options</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </Button>
            )}

            {/* Filters section - always visible on desktop, toggleable on mobile */}
            <div
                className={`
              flex flex-col gap-3 w-full sm:w-auto sm:flex-row sm:items-center 
              ${isMobile && !showFilters ? "hidden" : "flex"}
            `}
            >
              <CalendarDateRangePicker value={dateRange} onChange={handleDateRangeChange} showPresets={true} />

              {/* Company selector - hidden for bus owners */}
              {!hasRole("Bus Owner") && (
                  <Select value={selectedCompany} onValueChange={handleCompanyChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto" disabled={isExporting}>
                    {isExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                    ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Company Details Section for Bus Owners */}
          {hasRole("Bus Owner") && currentCompany && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      Company Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                        <p className="text-base font-semibold">{currentCompany.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                        <p className="text-base">{currentCompany.email || "Not provided"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                        <p className="text-base">{currentCompany.phone_number || "Not provided"}</p>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Company ID: {currentCompany.id}</span>
                      <span>•</span>
                      <span>Member since: {new Date(currentCompany.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
          )}

          {/* Quick Actions - pass bus owner status and companyId */}
          <QuickActions isBusOwner={hasRole("Bus Owner")} companyId={companyId} />

          {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {hasRole("Bus Owner") ? "Company Revenue" : "Total Revenue"}
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                    ) : (
                        <>
                          <div className="text-2xl font-bold">
                            TZS{" "}
                            {Number.parseFloat(stats?.metrics.total_revenue || "0").toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {hasRole("Bus Owner")
                                ? `${currentCompany?.name || "Your company"} earnings`
                                : `For period ${stats?.period.start_date} to ${stats?.period.end_date}`}
                          </p>
                        </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {hasRole("Bus Owner") ? "Company Bookings" : "Total Bookings"}
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                    ) : (
                        <>
                          <div className="text-2xl font-bold">{stats?.metrics.total_bookings.toLocaleString() || 0}</div>
                          <p className="text-xs text-muted-foreground">
                            {hasRole("Bus Owner")
                                ? `${stats?.metrics.bookings_per_day || 0} bookings per day`
                                : `${stats?.metrics.bookings_per_day} per day`}
                          </p>
                        </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {hasRole("Bus Owner") ? "Fleet Size" : "Active Vehicles"}
                    </CardTitle>
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                    ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {stats?.metrics.total_active_vehicles.toLocaleString() || 0}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {hasRole("Bus Owner")
                                ? "Active vehicles in your fleet"
                                : `TZS ${Number.parseFloat(stats?.metrics.revenue_per_vehicle || "0").toLocaleString(
                                    "en-US",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                )} per vehicle`}
                          </p>
                        </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Fare</CardTitle>
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                    ) : (
                        <>
                          <div className="text-2xl font-bold">
                            TZS{" "}
                            {Number.parseFloat(stats?.metrics.average_fare || "0").toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {hasRole("Bus Owner") ? "Per booking in your routes" : "Per booking"}
                          </p>
                        </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Charts */}
            <div>
              {dateRange.from && dateRange.to && (
                  <RevenueDistribution
                      isMobile={isMobile}
                      startDate={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined}
                      endDate={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined}
                      companyId={
                        hasRole("Bus Owner") && companyId
                            ? companyId.toString()
                            : selectedCompany === "all"
                                ? undefined
                                : selectedCompany
                      }
                      className="col-span-1 lg:col-span-5"
                  />
              )}
            </div>
          </div>
        </div>
      </div>
  )
}
