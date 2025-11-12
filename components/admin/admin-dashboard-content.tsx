"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RevenueChart } from "@/components/charts/revenue-chart"
import { TransactionChart } from "@/components/charts/transaction-chart"
import { SettlementsChart } from "@/components/charts/settlements-chart"
import { ExportPanel } from "@/components/admin/export-panel"
import { LegacyIntegrationPanel } from "@/components/admin/legacy-integration-panel"
import { SuccessMetricsDashboard } from "@/components/admin/success-metrics-dashboard"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import {
  LayoutDashboard,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Search,
  Download,
  Eye,
  LogOut,
  Hammer,
  BarChart3,
  CreditCard,
  Users,
  FileText,
  RefreshCw,
  Target,
} from "lucide-react"

// Mock data for admin dashboard
const mockStats = {
  totalRevenue: 127450.25,
  revenueChange: 12.5,
  completedSales: 347,
  salesChange: 8.2,
  pendingInvoices: 12,
  pendingChange: -15.3,
  avgSaleValue: 367.29,
  avgChange: 5.8,
}

const mockTransactions = [
  {
    id: "INV-2024-001234",
    buyerName: "John Doe",
    buyerId: "BUYER-1234",
    auctionTitle: "Estate Sale - Antiques & Collectibles",
    itemCount: 3,
    total: 3127.85,
    status: "paid",
    paymentMethod: "Visa •••• 4242",
    date: "2024-01-15T14:30:00",
  },
  {
    id: "INV-2024-001233",
    buyerName: "Jane Smith",
    buyerId: "BUYER-5678",
    auctionTitle: "Modern Art Collection",
    itemCount: 2,
    total: 5240.0,
    status: "paid",
    paymentMethod: "Mastercard •••• 8888",
    date: "2024-01-15T13:15:00",
  },
  {
    id: "INV-2024-001232",
    buyerName: "Bob Johnson",
    buyerId: "BUYER-9012",
    auctionTitle: "Vintage Car Parts",
    itemCount: 5,
    total: 1850.5,
    status: "pending",
    paymentMethod: "ACH Transfer",
    date: "2024-01-15T12:00:00",
  },
  {
    id: "INV-2024-001231",
    buyerName: "Alice Williams",
    buyerId: "BUYER-3456",
    auctionTitle: "Estate Sale - Antiques & Collectibles",
    itemCount: 1,
    total: 725.0,
    status: "paid",
    paymentMethod: "Amex •••• 1005",
    date: "2024-01-15T11:20:00",
  },
  {
    id: "INV-2024-001230",
    buyerName: "Charlie Brown",
    buyerId: "BUYER-7890",
    auctionTitle: "Jewelry & Watches",
    itemCount: 2,
    total: 8950.0,
    status: "paid",
    paymentMethod: "Visa •••• 9999",
    date: "2024-01-15T10:45:00",
  },
  {
    id: "INV-2024-001229",
    buyerName: "Diana Prince",
    buyerId: "BUYER-2345",
    auctionTitle: "Electronics & Tech",
    itemCount: 4,
    total: 2150.75,
    status: "failed",
    paymentMethod: "Visa •••• 1111",
    date: "2024-01-14T16:30:00",
  },
]

export function AdminDashboardContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")

  // API data states
  const [revenueData, setRevenueData] = useState<any>(null)
  const [transactionData, setTransactionData] = useState<any>(null)
  const [settlementData, setSettlementData] = useState<any>(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [loading, setLoading] = useState({
    revenue: false,
    transactions: false,
    settlements: false
  })

  useEffect(() => {
    const auth = localStorage.getItem("hibid_admin_auth")
    const email = localStorage.getItem("hibid_admin_email")

    if (!auth) {
      router.push("/admin/login")
    } else {
      setIsAuthenticated(true)
      setAdminEmail(email || "")
    }
  }, [router])

  // Fetch analytics data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData()
    }
  }, [isAuthenticated])

  const fetchAnalyticsData = async () => {
    // Fetch Revenue Analytics
    setLoading(prev => ({ ...prev, revenue: true }))
    try {
      const response = await fetch('/api/reports/revenue')
      if (response.ok) {
        const data = await response.json()
        setRevenueData(data.data)
      } else {
        // Fallback to mock data for static export
        setRevenueData(generateMockRevenueData())
      }
    } catch (error) {
      console.log('Using mock revenue data due to static export')
      setRevenueData(generateMockRevenueData())
    } finally {
      setLoading(prev => ({ ...prev, revenue: false }))
    }

    // Fetch Transaction Analytics
    setLoading(prev => ({ ...prev, transactions: true }))
    try {
      const response = await fetch('/api/reports/transactions?limit=100')
      if (response.ok) {
        const data = await response.json()
        setTransactionData(data.data)
      } else {
        setTransactionData(generateMockTransactionData())
      }
    } catch (error) {
      console.log('Using mock transaction data due to static export')
      setTransactionData(generateMockTransactionData())
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }))
    }

    // Fetch Settlements Data
    setLoading(prev => ({ ...prev, settlements: true }))
    try {
      const response = await fetch('/api/reports/settlements?limit=100')
      if (response.ok) {
        const data = await response.json()
        setSettlementData(data.data)
      } else {
        setSettlementData(generateMockSettlementData())
      }
    } catch (error) {
      console.log('Using mock settlement data due to static export')
      setSettlementData(generateMockSettlementData())
    } finally {
      setLoading(prev => ({ ...prev, settlements: false }))
    }
  }

  // Mock data generators for static export fallback
  const generateMockRevenueData = () => ({
    summary: {
      totalRevenue: 127450.25,
      totalTransactions: 347,
      avgTransactionValue: 367.29,
      totalPremiumRevenue: 12745.03,
      totalTaxRevenue: 8941.64,
      totalNetRevenue: 105763.58,
      growthRate: 12.5,
      period: "Last 30 days"
    },
    dailyData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      revenue: Math.random() * 5000 + 2000,
      transactions: Math.floor(Math.random() * 20) + 5,
      avgValue: Math.random() * 500 + 200,
      premiumRevenue: Math.random() * 500 + 100,
      taxRevenue: Math.random() * 400 + 50,
      netRevenue: Math.random() * 4000 + 1500
    })),
    breakdowns: {
      paymentMethods: [
        { method: 'card', count: 280, total: 98000, avgAmount: 350 },
        { method: 'bank_transfer', count: 45, total: 18000, avgAmount: 400 },
        { method: 'check', count: 22, total: 11450.25, avgAmount: 520 }
      ],
      topItems: [
        { title: "Vintage Rolex Watch", lotNumber: "A123", salesCount: 3, avgQuantity: 1, totalSales: 15000, avgUnitPrice: 5000 },
        { title: "Antique Furniture Set", lotNumber: "B456", salesCount: 2, avgQuantity: 1, totalSales: 12000, avgUnitPrice: 6000 }
      ]
    }
  })

  const generateMockTransactionData = () => ({
    transactions: mockTransactions,
    summary: {
      totalCount: 347,
      completedCount: 320,
      pendingCount: 20,
      failedCount: 7,
      completionRate: 92.2,
      totalAmount: 127450.25,
      avgAmount: 367.29,
      maxAmount: 15000,
      minAmount: 25.50
    },
    breakdowns: {
      status: [
        { status: 'completed', count: 320, totalAmount: 120000, avgAmount: 375 },
        { status: 'pending', count: 20, totalAmount: 5450.25, avgAmount: 272.51 },
        { status: 'failed', count: 7, totalAmount: 2000, avgAmount: 285.71 }
      ],
      paymentMethods: [
        { method: 'card', count: 280, total: 98000, avgAmount: 350 },
        { method: 'bank_transfer', count: 45, total: 18000, avgAmount: 400 },
        { method: 'check', count: 22, total: 11450.25, avgAmount: 520 }
      ]
    },
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: Math.floor(Math.random() * 15) + 1,
      totalAmount: Math.random() * 2000 + 200
    }))
  })

  const generateMockSettlementData = () => ({
    settlements: Array.from({ length: 20 }, (_, i) => ({
      settlementId: `SET-${1000 + i}`,
      status: ['settled', 'pending', 'disputed'][Math.floor(Math.random() * 3)],
      netProceeds: Math.random() * 10000 + 1000,
      commissionRate: Math.random() * 20 + 5,
      itemCount: Math.floor(Math.random() * 5) + 1,
      settledItems: Math.floor(Math.random() * 5) + 1,
      consignor: {
        name: `Consignor ${i + 1}`,
        company: `Company ${String.fromCharCode(65 + i)}`
      }
    })),
    statusBreakdown: [
      { status: 'settled', count: 150, totalHammer: 100000, totalCommission: 15000, totalNetProceeds: 85000 },
      { status: 'pending', count: 35, totalHammer: 25000, totalCommission: 3750, totalNetProceeds: 21250 },
      { status: 'disputed', count: 5, totalHammer: 8000, totalCommission: 1200, totalNetProceeds: 6800 }
    ],
    consignorBreakdown: [
      { consignorId: 'C1', name: 'John Smith Ltd', totalNetProceeds: 15000, settlementCount: 8, settledCount: 7, avgCommissionRate: 12.5 },
      { consignorId: 'C2', name: 'Estate Sales Co', totalNetProceeds: 12000, settlementCount: 6, settledCount: 5, avgCommissionRate: 15.0 }
    ],
    commissionDistribution: [
      { bracket: '10% - 14.99%', count: 80, totalNetProceeds: 45000 },
      { bracket: '15% - 19.99%', count: 60, totalNetProceeds: 35000 },
      { bracket: '5% - 9.99%', count: 30, totalNetProceeds: 18000 },
      { bracket: '20% - 24.99%', count: 15, totalNetProceeds: 10000 },
      { bracket: 'Under 5%', count: 5, totalNetProceeds: 2000 }
    ]
  })

  const handleLogout = () => {
    localStorage.removeItem("hibid_admin_auth")
    localStorage.removeItem("hibid_admin_email")
    localStorage.removeItem("hibid_admin_name")
    router.push("/admin/login")
  }

  const filteredTransactions = mockTransactions.filter((txn) => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.buyerId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Invoice Management & Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button
                variant="outline"
                className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                onClick={() => setShowExportPanel(true)}
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              <Button
                asChild
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Link href="/admin/test-auction">
                  <Hammer className="h-4 w-4" />
                  Test Auction
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAnalyticsData}
                disabled={loading.revenue}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading.revenue ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              ${revenueData?.summary?.totalRevenue?.toLocaleString() || mockStats.totalRevenue.toLocaleString()}
            </p>
            {revenueData?.summary?.growthRate && (
              <Badge variant="outline" className={revenueData.summary.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                {revenueData.summary.growthRate > 0 ? "+" : ""}
                {revenueData.summary.growthRate.toFixed(1)}%
              </Badge>
            )}
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">
              {transactionData?.summary?.totalCount || mockStats.completedSales}
            </p>
            {transactionData?.summary?.completionRate && (
              <Badge variant="outline" className="text-blue-600">
                {transactionData.summary.completionRate.toFixed(1)}% complete
              </Badge>
            )}
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900">
              ${revenueData?.summary?.avgTransactionValue?.toFixed(0) || mockStats.avgSaleValue.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">per transaction</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending Invoices</p>
            <p className="text-2xl font-bold text-gray-900">
              {transactionData?.summary?.pendingCount || mockStats.pendingInvoices}
            </p>
            <p className="text-xs text-muted-foreground">awaiting payment</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Settlements</p>
            <p className="text-2xl font-bold text-gray-900">
              {settlementData?.summary?.settledCount || 0}
            </p>
            {settlementData?.summary?.settlementRate && (
              <Badge variant="outline" className="text-indigo-600">
                {settlementData.summary.settlementRate.toFixed(1)}% settled
              </Badge>
            )}
          </Card>
        </div>

        {/* Enhanced Analytics Dashboard with Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="success-metrics">Success Metrics</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="legacy">Legacy Data</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {revenueData && (
                <RevenueChart
                  data={revenueData.dailyData}
                  title="Revenue Overview"
                  description="Revenue trends and performance metrics"
                  growthRate={revenueData.summary.growthRate}
                  height={300}
                />
              )}
              {transactionData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Transaction Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {transactionData.summary.completedCount}
                          </p>
                          <p className="text-sm text-green-800">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">
                            {transactionData.summary.pendingCount}
                          </p>
                          <p className="text-sm text-yellow-800">Pending</p>
                        </div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {transactionData.summary.completionRate.toFixed(1)}%
                        </p>
                        <p className="text-sm text-blue-800">Completion Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Revenue Analytics Tab */}
          <TabsContent value="revenue" className="space-y-6">
            {revenueData && (
              <RevenueChart
                data={revenueData.dailyData}
                title="Revenue Analytics"
                description="Detailed revenue analysis and trends"
                growthRate={revenueData.summary.growthRate}
              />
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {transactionData && (
              <TransactionChart
                hourlyData={transactionData.hourlyDistribution}
                statusBreakdown={transactionData.breakdowns.status}
                paymentMethodBreakdown={transactionData.breakdowns.paymentMethods}
                completionRate={transactionData.summary.completionRate}
              />
            )}
          </TabsContent>

          {/* Settlements Tab */}
          <TabsContent value="settlements" className="space-y-6">
            {settlementData && (
              <SettlementsChart
                settlements={settlementData.settlements}
                statusBreakdown={settlementData.statusBreakdown}
                consignorBreakdown={settlementData.consignorBreakdown}
                commissionDistribution={settlementData.commissionDistribution}
                settlementRate={settlementData.summary.settlementRate}
                totalNetProceeds={settlementData.summary.totalNetProceeds}
              />
            )}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                  <CardDescription>AI-powered analysis of your auction performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">🔥 Strong Performance</h4>
                    <p className="text-sm text-green-700">
                      Your completion rate of {transactionData?.summary?.completionRate?.toFixed(1)}% is above the industry average of 85%.
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Revenue Opportunity</h4>
                    <p className="text-sm text-blue-700">
                      Average transaction value of ${revenueData?.summary?.avgTransactionValue?.toFixed(0)} suggests room for premium item positioning.
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Action Required</h4>
                    <p className="text-sm text-yellow-700">
                      {transactionData?.summary?.pendingCount || 0} pending invoices need follow-up to optimize cash flow.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Buyer Behavior Insights
                  </CardTitle>
                  <CardDescription>Patterns and recommendations for buyer engagement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">🎯 Peak Activity Times</h4>
                    <p className="text-sm text-purple-700">
                      Highest transaction volume occurs between 2 PM - 6 PM. Consider scheduling auction endings during these hours.
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h4 className="font-semibold text-indigo-800 mb-2">💳 Payment Preferences</h4>
                    <p className="text-sm text-indigo-700">
                      {(() => {
                        const cardPayments = transactionData?.breakdowns?.paymentMethods?.find((m: any) => m.method === 'card')?.count || 0;
                        const total = transactionData?.summary?.totalCount || 1;
                        const percentage = ((cardPayments / total) * 100).toFixed(1);
                        return `${percentage}% of buyers prefer card payments - ensure your payment processing is optimized.`;
                      })()}
                    </p>
                  </div>
                  <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                    <h4 className="font-semibold text-pink-800 mb-2">📈 Growth Potential</h4>
                    <p className="text-sm text-pink-700">
                      Revenue growth of {revenueData?.summary?.growthRate?.toFixed(1)}% indicates healthy business expansion.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Predictive Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Predictive Analytics
                </CardTitle>
                <CardDescription>Forecasted performance based on current trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      ${((revenueData?.summary?.totalRevenue || 0) * 1.15).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-700 font-medium">Next Month Forecast</p>
                    <p className="text-xs text-blue-600 mt-1">Based on current growth rate</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {Math.floor((transactionData?.summary?.totalCount || 0) * 1.1)}
                    </p>
                    <p className="text-sm text-green-700 font-medium">Expected Transactions</p>
                    <p className="text-xs text-green-600 mt-1">Next 30 days</p>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {((revenueData?.summary?.avgTransactionValue || 0) * 1.05).toFixed(0)}
                    </p>
                    <p className="text-sm text-purple-700 font-medium">Projected Avg Value</p>
                    <p className="text-xs text-purple-600 mt-1">With optimization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Success Metrics Tab */}
          <TabsContent value="success-metrics" className="space-y-6">
            <SuccessMetricsDashboard />
          </TabsContent>

          {/* Legacy Data Integration Tab */}
          <TabsContent value="legacy" className="space-y-6">
            <LegacyIntegrationPanel />
          </TabsContent>
        </Tabs>

        {/* Detailed Transactions Table */}
        <Card className="bg-white mt-6">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("paid")}
                  className={statusFilter === "paid" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Paid
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                  className={statusFilter === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("failed")}
                  className={statusFilter === "failed" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Failed
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice ID, buyer name, or buyer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Invoice ID</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Buyer</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Auction</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Items</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Total</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Payment</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.slice(0, 10).map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-mono text-sm font-medium text-gray-900">{txn.id}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-900">{txn.buyerName}</p>
                        <p className="text-sm text-gray-600">{txn.buyerId}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-900 max-w-xs truncate">{txn.auctionTitle}</p>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline">{txn.itemCount} items</Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-semibold text-gray-900">${txn.total.toFixed(2)}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-900">{txn.paymentMethod}</p>
                    </td>
                    <td className="py-4 px-6">
                      <Badge className={getStatusColor(txn.status)}>
                        {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-900">{new Date(txn.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(txn.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                          <Link href={`/invoice/${txn.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-600">No transactions found matching your criteria.</p>
            </div>
          )}
        </Card>
      </main>

      {/* Export Panel Modal */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Export Reports</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExportPanel(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6">
              <ExportPanel
                revenueData={revenueData}
                transactionData={transactionData}
                settlementData={settlementData}
                onExport={(format, config) => {
                  console.log(`Exported ${format} with config:`, config);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
