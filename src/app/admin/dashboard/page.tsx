"use client"

import { useEffect, useState } from "react"
import { Calendar, Car, Download, LineChart, Loader2, Wallet, ChevronDown, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { BookingsDistribution } from "@/components/dashboard/bookings-distribution"
import { RevenueDistribution } from "@/components/dashboard/revenue-distribution"
import { useMobile } from "@/hooks/use-mobile"
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { motion } from "framer-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import type { DateRange } from "react-day-picker"
import type { DashboardStats, Company, ExportFormat } from "@/types/dashboard"
import {
  getCompanies,
  getDashboardStats,
  getDefaultDateRange,
  setupTokenValidation,
  exportDashboardData,
} from "@/lib/services/dashboard"

export default function DashboardPage() {
  const isMobile = useMobile()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange())
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Set up token validation
  useEffect(() => {
    const cleanup = setupTokenValidation()
    return cleanup
  }, [])

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await getCompanies()
        if (response.success && Array.isArray(response.data)) {
          setCompanies(response.data)
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
  }, [toast])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const startDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
        const endDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""

        const response = await getDashboardStats(
            selectedCompany === "all" ? undefined : selectedCompany,
            startDate,
            endDate,
        )

        if (response.success) {
          setStats(response.data)
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
  }, [selectedCompany, dateRange])

  const handleDateRangeChange = (range: DateRange) => {
    if (range.from && range.to) {
      setDateRange(range)
    }
  }

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value)
  }

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return

    setIsExporting(true)
    try {
      // @ts-ignore
      const startDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
      // @ts-ignore
      const endDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""

      if (!startDate || !endDate) {
        throw new Error("Please select a valid date range")
      }

      const blob = await exportDashboardData(
          format,
          startDate,
          endDate,
          selectedCompany === "all" ? undefined : selectedCompany,
      )

      if (!blob) {
        throw new Error("Failed to generate export file")
      }

      // Create downloadable link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const companyName =
          selectedCompany === "all"
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

  return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 bg-background rounded-lg border border-border/40 shadow-sm">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

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

          {/* Quick Actions */}
          <QuickActions />

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
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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
                            For period {stats?.period.start_date} to {stats?.period.end_date}
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
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
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
                          <p className="text-xs text-muted-foreground">{stats?.metrics.bookings_per_day} per day</p>
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
                    <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
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
                            TZS{" "}
                            {Number.parseFloat(stats?.metrics.revenue_per_vehicle || "0").toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            per vehicle
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
                          <p className="text-xs text-muted-foreground">Per booking</p>
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
                      companyId={selectedCompany === "all" ? undefined : selectedCompany}
                      className="col-span-1 lg:col-span-5"
                  />
              )}
              {/*<BookingsDistribution isMobile={isMobile} />*/}
            </div>
          </div>
        </div>
      </div>
  )
}
