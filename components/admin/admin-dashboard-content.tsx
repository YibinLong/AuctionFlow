"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
              <Button variant="outline" className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent">
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
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <Badge variant="outline" className={mockStats.revenueChange > 0 ? "text-green-600" : "text-red-600"}>
                {mockStats.revenueChange > 0 ? "+" : ""}
                {mockStats.revenueChange}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">${mockStats.totalRevenue.toLocaleString()}</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
              </div>
              <Badge variant="outline" className={mockStats.salesChange > 0 ? "text-green-600" : "text-red-600"}>
                {mockStats.salesChange > 0 ? "+" : ""}
                {mockStats.salesChange}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Completed Sales</p>
            <p className="text-3xl font-bold text-gray-900">{mockStats.completedSales}</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <Badge variant="outline" className={mockStats.pendingChange > 0 ? "text-green-600" : "text-red-600"}>
                {mockStats.pendingChange > 0 ? "+" : ""}
                {mockStats.pendingChange}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending Invoices</p>
            <p className="text-3xl font-bold text-gray-900">{mockStats.pendingInvoices}</p>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <Badge variant="outline" className={mockStats.avgChange > 0 ? "text-green-600" : "text-red-600"}>
                {mockStats.avgChange > 0 ? "+" : ""}
                {mockStats.avgChange}%
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-1">Avg Sale Value</p>
            <p className="text-3xl font-bold text-gray-900">${mockStats.avgSaleValue}</p>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="bg-white">
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
                {filteredTransactions.map((txn) => (
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
    </div>
  )
}
