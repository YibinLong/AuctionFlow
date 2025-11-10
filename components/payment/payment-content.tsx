"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ShoppingBag, ArrowLeft, Shield, CreditCard, Lock, Check } from "lucide-react"

export function PaymentContent() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "ach">("card")

  // Mock total from checkout (would come from API in production)
  const orderTotal = 3127.85

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate API call to /api/payment/confirm
    setTimeout(() => {
      // Generate invoice ID and redirect
      const invoiceId = "INV-" + Date.now()
      router.push(`/invoice/${invoiceId}`)
    }, 2000)
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
                <p className="text-sm text-gray-600">Secure Payment</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 opacity-50">
              <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-gray-500">Review Items</p>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>
            <div className="h-px flex-1 bg-gray-300 mx-4" />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">Payment</p>
                <p className="text-sm text-gray-600">Secure checkout</p>
              </div>
            </div>
            <div className="h-px flex-1 bg-gray-300 mx-4" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="h-10 w-10 rounded-full border-2 border-gray-300 flex items-center justify-center font-semibold text-gray-500">
                3
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-gray-500">Confirmation</p>
                <p className="text-sm text-gray-500">Get invoice</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmitPayment} className="space-y-6">
              {/* Payment Method Selection */}
              <Card className="p-6 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                      paymentMethod === "card" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard className={`h-5 w-5 ${paymentMethod === "card" ? "text-blue-600" : "text-gray-400"}`} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Credit Card</p>
                      <p className="text-xs text-gray-600">Visa, Mastercard, Amex</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ach")}
                    className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-all ${
                      paymentMethod === "ach" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 flex items-center justify-center ${paymentMethod === "ach" ? "text-blue-600" : "text-gray-400"}`}
                    >
                      <span className="text-xs font-bold">ACH</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Bank Transfer</p>
                      <p className="text-xs text-gray-600">Direct debit</p>
                    </div>
                  </button>
                </div>

                {paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        required
                        className="mt-1.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" type="text" placeholder="MM / YY" required className="mt-1.5" />
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input id="cvc" type="text" placeholder="123" required className="mt-1.5" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input id="cardName" type="text" placeholder="John Doe" required className="mt-1.5" />
                    </div>
                  </div>
                )}

                {paymentMethod === "ach" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" type="text" placeholder="000123456789" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input id="routingNumber" type="text" placeholder="123456789" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="accountName">Account Holder Name</Label>
                      <Input id="accountName" type="text" placeholder="John Doe" required className="mt-1.5" />
                    </div>
                  </div>
                )}
              </Card>

              {/* Billing Information */}
              <Card className="p-6 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Billing Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" required className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" type="text" placeholder="John" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" type="text" placeholder="Doe" required className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input id="address" type="text" placeholder="123 Main St" required className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" type="text" placeholder="New York" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" type="text" placeholder="NY" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" type="text" placeholder="10001" required className="mt-1.5" />
                    </div>
                  </div>
                </div>
              </Card>

              <Button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 text-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Complete Payment ${orderTotal.toFixed(2)}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 bg-white shadow-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">$2,475.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Buyer's Premium</span>
                    <span className="font-medium text-gray-900">$420.75</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales Tax</span>
                    <span className="font-medium text-gray-900">$232.10</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      ${orderTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Fraud protection enabled</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-700">
                    Your payment is processed securely. We never store your full payment details.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
