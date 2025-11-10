"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag, ArrowRight, Shield, Clock } from "lucide-react"

export function CheckoutContent() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutData, setCheckoutData] = useState<any>(null)

  useEffect(() => {
    // Try to load checkout data from localStorage (from test auction)
    const storedData = localStorage.getItem("hibid_checkout_data")

    if (storedData) {
      const parsed = JSON.parse(storedData)
      setCheckoutData(parsed)
    } else {
      // Fallback to mock data if no stored data
      setCheckoutData({
        auctionId: "AUC-2024-001",
        auctionTitle: "Estate Sale - Antiques & Collectibles",
        auctionEndDate: "2024-01-15T18:00:00",
        buyerId: "BUYER-1234",
        items: [
          {
            id: 1,
            lotNumber: "101",
            title: "Vintage Oak Dining Table with 6 Chairs",
            description: "1920s solid oak, excellent condition",
            imageUrl: "/placeholder.svg?height=120&width=120",
            winningBid: 850.0,
            buyersPremium: 0.17,
            taxRate: 0.085,
          },
          {
            id: 2,
            lotNumber: "142",
            title: "Collection of 19th Century Books",
            description: "Leather-bound classics, complete set",
            imageUrl: "/placeholder.svg?height=120&width=120",
            winningBid: 425.0,
            buyersPremium: 0.17,
            taxRate: 0.085,
          },
          {
            id: 3,
            lotNumber: "203",
            title: "Victorian Era Oil Painting",
            description: "Signed landscape, original frame",
            imageUrl: "/placeholder.svg?height=120&width=120",
            winningBid: 1200.0,
            buyersPremium: 0.17,
            taxRate: 0.085,
          },
        ],
      })
    }
  }, [])

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    )
  }

  // Calculate totals - handle both percentage formats (0.17 or 17)
  const calculations = checkoutData.items.map((item: any) => {
    const premiumRate = item.buyersPremium > 1 ? item.buyersPremium / 100 : item.buyersPremium
    const taxRateDecimal = item.taxRate > 1 ? item.taxRate / 100 : item.taxRate

    const premium = item.winningBid * premiumRate
    const subtotal = item.winningBid + premium
    const tax = subtotal * taxRateDecimal
    const total = subtotal + tax

    return {
      ...item,
      premium,
      subtotal,
      tax,
      total,
      premiumRate,
      taxRateDecimal,
    }
  })

  const grandTotal = calculations.reduce((sum: number, item: any) => sum + item.total, 0)
  const totalBids = calculations.reduce((sum: number, item: any) => sum + item.winningBid, 0)
  const totalPremium = calculations.reduce((sum: number, item: any) => sum + item.premium, 0)
  const totalTax = calculations.reduce((sum: number, item: any) => sum + item.tax, 0)

  const handleProceedToPayment = () => {
    setIsProcessing(true)
    // Store the total for payment page
    localStorage.setItem("hibid_payment_total", grandTotal.toFixed(2))
    // Simulate API call to /api/checkout/start
    setTimeout(() => {
      router.push("/payment")
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HiBid Checkout</h1>
                <p className="text-sm text-gray-600">{checkoutData.auctionTitle || "Auction Checkout"}</p>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Auction Ended
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Review Items</p>
                    <p className="text-sm text-gray-600">Verify your winning bids</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
                <div className="flex items-center gap-3 opacity-50">
                  <div className="h-10 w-10 rounded-full border-2 border-gray-300 flex items-center justify-center font-semibold text-gray-500">
                    2
                  </div>
                  <div className="hidden sm:block">
                    <p className="font-semibold text-gray-500">Payment</p>
                    <p className="text-sm text-gray-500">Secure checkout</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-3 opacity-50">
                  <div className="h-10 w-10 rounded-full border-2 border-gray-300 flex items-center justify-center font-semibold text-gray-500">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-500">Confirmation</p>
                    <p className="text-sm text-gray-500">Get your invoice</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Winning Items */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Your Winning Bids</h2>
              {calculations.map((item: any) => (
                <Card
                  key={item.id || item.lotNumber}
                  className="p-6 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-6">
                    <img
                      src={item.imageUrl || item.image || "/placeholder.svg?height=120&width=120"}
                      alt={item.title}
                      className="h-24 w-24 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              Lot #{item.lotNumber}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Winner</Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-gray-600 mb-1">Winning Bid</p>
                          <p className="text-2xl font-bold text-gray-900">${item.winningBid.toFixed(2)}</p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Buyer's Premium ({(item.premiumRate * 100).toFixed(0)}%)</p>
                          <p className="font-semibold text-gray-900">${item.premium.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tax ({(item.taxRateDecimal * 100).toFixed(1)}%)</p>
                          <p className="font-semibold text-gray-900">${item.tax.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">Item Total</p>
                          <p className="font-semibold text-blue-600">${item.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 bg-white shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Bids ({calculations.length} items)</span>
                    <span className="font-medium text-gray-900">${totalBids.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Buyer's Premium</span>
                    <span className="font-medium text-gray-900">${totalPremium.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales Tax</span>
                    <span className="font-medium text-gray-900">${totalTax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total Due</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleProceedToPayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 text-base font-semibold"
                >
                  {isProcessing ? "Processing..." : "Proceed to Payment"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Secure SSL encrypted checkout</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your payment information is protected with industry-standard encryption
                  </p>
                </div>

                {checkoutData.auctionId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <strong>Auction Details:</strong>
                      <br />
                      {checkoutData.auctionId && `Auction ID: ${checkoutData.auctionId}`}
                      <br />
                      {checkoutData.buyerId && `Buyer ID: ${checkoutData.buyerId}`}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
