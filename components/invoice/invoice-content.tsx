"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Download, Mail, Printer, ShoppingBag, ArrowLeft } from "lucide-react"
import Link from "next/link"

// Mock invoice data - structured for easy API integration
const mockInvoiceData = {
  invoiceNumber: "INV-2024-001234",
  invoiceDate: new Date().toISOString(),
  paymentStatus: "paid",
  paymentMethod: "Visa ending in 4242",
  transactionId: "TXN-" + Date.now(),

  auction: {
    id: "AUC-2024-001",
    title: "Estate Sale - Antiques & Collectibles",
    endDate: "2024-01-15T18:00:00",
  },

  buyer: {
    id: "BUYER-1234",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main St, New York, NY 10001",
  },

  seller: {
    name: "Heritage Auction House",
    address: "456 Auction Blvd, Suite 100",
    city: "New York, NY 10002",
    phone: "(555) 987-6543",
    email: "contact@heritageauction.com",
  },

  items: [
    {
      lotNumber: "101",
      title: "Vintage Oak Dining Table with 6 Chairs",
      winningBid: 850.0,
      buyersPremium: 144.5,
      tax: 84.63,
      total: 1079.13,
    },
    {
      lotNumber: "142",
      title: "Collection of 19th Century Books",
      winningBid: 425.0,
      buyersPremium: 72.25,
      tax: 42.32,
      total: 539.57,
    },
    {
      lotNumber: "203",
      title: "Victorian Era Oil Painting",
      winningBid: 1200.0,
      buyersPremium: 204.0,
      tax: 119.34,
      total: 1523.34,
    },
  ],
}

const totals = mockInvoiceData.items.reduce(
  (acc, item) => ({
    bids: acc.bids + item.winningBid,
    premium: acc.premium + item.buyersPremium,
    tax: acc.tax + item.tax,
    total: acc.total + item.total,
  }),
  { bids: 0, premium: 0, tax: 0, total: 0 },
)

interface InvoiceContentProps {
  invoiceId: string
}

export function InvoiceContent({ invoiceId }: InvoiceContentProps) {
  const handleDownloadPDF = () => {
    // Would trigger /api/invoice/:id/pdf in production
    console.log("Downloading invoice PDF...")
  }

  const handleEmailInvoice = () => {
    // Would trigger /api/invoice/:id/email in production
    console.log("Emailing invoice...")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HiBid</h1>
                <p className="text-sm text-gray-600">Invoice & Receipt</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-transparent">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailInvoice} className="gap-2 bg-transparent">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
              <Button size="sm" onClick={handleDownloadPDF} className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Banner */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
              <p className="text-gray-700">
                Your payment has been processed successfully. A confirmation email has been sent to{" "}
                <span className="font-semibold">{mockInvoiceData.buyer.email}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Invoice Card */}
        <Card className="bg-white shadow-xl print:shadow-none overflow-hidden p-0">
          {/* Invoice Header */}
          <div className="p-8 bg-gradient-to-br from-blue-500 to-indigo-600">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-3">INVOICE</h1>
              </div>
              <Badge className="bg-green-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-green-600">PAID</Badge>
            </div>
            <div className="flex justify-between items-end text-white/90">
              <div className="space-y-1">
                <p className="text-sm">Invoice Number</p>
                <p className="text-lg font-semibold text-white">{mockInvoiceData.invoiceNumber}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm">Invoice Date</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(mockInvoiceData.invoiceDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Parties Information */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">From</h3>
                <div className="text-gray-900">
                  <p className="font-bold text-lg">{mockInvoiceData.seller.name}</p>
                  <p className="text-sm">{mockInvoiceData.seller.address}</p>
                  <p className="text-sm">{mockInvoiceData.seller.city}</p>
                  <p className="text-sm mt-2">{mockInvoiceData.seller.phone}</p>
                  <p className="text-sm">{mockInvoiceData.seller.email}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Bill To</h3>
                <div className="text-gray-900">
                  <p className="font-bold text-lg">{mockInvoiceData.buyer.name}</p>
                  <p className="text-sm">{mockInvoiceData.buyer.address}</p>
                  <p className="text-sm mt-2">{mockInvoiceData.buyer.phone}</p>
                  <p className="text-sm">{mockInvoiceData.buyer.email}</p>
                  <p className="text-sm mt-2">
                    <span className="text-gray-600">Buyer ID:</span> {mockInvoiceData.buyer.id}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Auction Information */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Auction Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Auction ID</p>
                  <p className="font-semibold text-gray-900">{mockInvoiceData.auction.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Auction Title</p>
                  <p className="font-semibold text-gray-900">{mockInvoiceData.auction.title}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Items Won</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">LOT #</th>
                      <th className="text-left py-3 px-2 text-sm font-semibold text-gray-600">DESCRIPTION</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">WINNING BID</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">PREMIUM</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">TAX</th>
                      <th className="text-right py-3 px-2 text-sm font-semibold text-gray-600">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockInvoiceData.items.map((item) => (
                      <tr key={item.lotNumber} className="border-b border-gray-100">
                        <td className="py-4 px-2 text-sm font-medium text-gray-900">{item.lotNumber}</td>
                        <td className="py-4 px-2 text-sm text-gray-900">{item.title}</td>
                        <td className="py-4 px-2 text-sm text-right text-gray-900">${item.winningBid.toFixed(2)}</td>
                        <td className="py-4 px-2 text-sm text-right text-gray-900">${item.buyersPremium.toFixed(2)}</td>
                        <td className="py-4 px-2 text-sm text-right text-gray-900">${item.tax.toFixed(2)}</td>
                        <td className="py-4 px-2 text-sm text-right font-semibold text-gray-900">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal (Bids)</span>
                  <span className="font-medium text-gray-900">${totals.bids.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Buyer's Premium</span>
                  <span className="font-medium text-gray-900">${totals.premium.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sales Tax</span>
                  <span className="font-medium text-gray-900">${totals.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between pt-2">
                  <span className="text-lg font-bold text-gray-900">Total Paid</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    ${totals.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Information</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Payment Method</p>
                  <p className="font-semibold text-gray-900">{mockInvoiceData.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-gray-600">Transaction ID</p>
                  <p className="font-semibold text-gray-900">{mockInvoiceData.transactionId}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(mockInvoiceData.invoiceDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payment Confirmed</Badge>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-8 pt-8 border-t text-center">
              <p className="text-sm text-gray-600">
                Thank you for your purchase! For questions, please contact us at{" "}
                <a href={`mailto:${mockInvoiceData.seller.email}`} className="text-blue-600 hover:underline">
                  {mockInvoiceData.seller.email}
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-2">This is an official invoice from HiBid Auction Platform</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
