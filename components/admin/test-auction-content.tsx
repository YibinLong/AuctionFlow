"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, ArrowLeft, ShoppingCart } from "lucide-react"

// Mock auction items for testing
const mockAuctionItems = [
  {
    id: 1,
    lotNumber: "LOT-001",
    title: "Antique Victorian Writing Desk",
    description: "Authentic 19th century mahogany writing desk with brass hardware",
    currentBid: 1250.0,
    image: "/placeholder.svg?height=400&width=600",
  },
  {
    id: 2,
    lotNumber: "LOT-002",
    title: "Abstract Modern Art Canvas",
    description: "Large-scale contemporary art piece by emerging artist",
    currentBid: 875.0,
    image: "/placeholder.svg?height=400&width=600",
  },
  {
    id: 3,
    lotNumber: "LOT-003",
    title: "Vintage Rolex Submariner Watch",
    description: "1960s Rolex Submariner in excellent condition with original box",
    currentBid: 15500.0,
    image: "/placeholder.svg?height=400&width=600",
  },
  {
    id: 4,
    lotNumber: "LOT-004",
    title: "Mid-Century Modern Lounge Chair",
    description: "Eames-style leather lounge chair with ottoman",
    currentBid: 2100.0,
    image: "/placeholder.svg?height=400&width=600",
  },
  {
    id: 5,
    lotNumber: "LOT-005",
    title: "Rare First Edition Book Collection",
    description: "Set of 5 first edition classic literature books",
    currentBid: 3250.0,
    image: "/placeholder.svg?height=400&width=600",
  },
  {
    id: 6,
    lotNumber: "LOT-006",
    title: "Persian Hand-Woven Rug",
    description: "Authentic Persian Tabriz rug, 9x12 feet, wool and silk",
    currentBid: 4800.0,
    image: "/placeholder.svg?height=400&width=600",
  },
]

export function TestAuctionContent() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem("hibid_admin_auth")
    if (!auth) {
      router.push("/admin/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  const handleStartCheckout = (item: (typeof mockAuctionItems)[0]) => {
    // Store the selected item in localStorage for the checkout flow
    const checkoutData = {
      items: [
        {
          id: item.id,
          lotNumber: item.lotNumber,
          title: item.title,
          winningBid: item.currentBid,
          buyersPremium: item.currentBid * 0.15,
          tax: item.currentBid * 0.065,
        },
      ],
    }
    localStorage.setItem("hibid_checkout_data", JSON.stringify(checkoutData))
    router.push("/checkout")
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
                <h1 className="text-xl font-bold text-gray-900">Test Auction</h1>
                <p className="text-sm text-gray-600">Select an item to test the checkout flow</p>
              </div>
            </div>
            <Button variant="outline" asChild className="gap-2 bg-transparent">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auction Items Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Items</h2>
          <p className="text-gray-600">Click on any item to simulate winning the bid and proceed to checkout</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAuctionItems.map((item) => (
            <Card key={item.id} className="bg-white overflow-hidden hover:shadow-lg transition-shadow">
              {/* Item Image */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                <Badge className="absolute top-3 left-3 bg-blue-600 text-white">{item.lotNumber}</Badge>
              </div>

              {/* Item Details */}
              <div className="p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

                {/* Current Bid */}
                <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-medium mb-1">Current Bid</p>
                  <p className="text-2xl font-bold text-green-900">${item.currentBid.toLocaleString()}</p>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleStartCheckout(item)}
                  className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Win & Checkout
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
