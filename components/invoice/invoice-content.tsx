"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Download, Mail, Printer, ShoppingBag, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

interface InvoiceData {
  id: string;
  invoice_number: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  subtotal: number;
  buyers_premium_rate: number;
  buyers_premium_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  currency: string;
  due_date: string;
  created_at: string;
  updated_at?: string;
  items: Array<{
    id: string;
    lot_id: string;
    title: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  buyer_info?: {
    name: string;
    email: string;
  };
}

interface InvoiceContentProps {
  invoiceId: string
}

export function InvoiceContent({ invoiceId }: InvoiceContentProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/invoices/${invoiceId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invoice not found');
        } else {
          setError('Failed to load invoice');
        }
        return;
      }

      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

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

  const handlePayNow = async () => {
    if (!invoice) return;

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          success_url: `${window.location.origin}/invoice/${invoice.id}?payment=success`,
          cancel_url: `${window.location.origin}/invoice/${invoice.id}?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        console.error('Failed to create payment session');
        return;
      }

      const data = await response.json();
      if (data.session_url) {
        window.location.href = data.session_url;
      }
    } catch (err) {
      console.error('Error creating payment session:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'Invoice not found'}</p>
            <Link href="/admin">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const totals = {
    bids: invoice.subtotal,
    premium: invoice.buyers_premium_amount,
    tax: invoice.tax_amount,
    total: invoice.grand_total,
  };

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
        {/* Status Banner */}
        <Card className={`p-6 mb-8 border-2 ${
          invoice.status === 'paid'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
            : invoice.status === 'pending'
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
            : invoice.status === 'overdue'
            ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
            : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0 ${
              invoice.status === 'paid'
                ? 'bg-green-600'
                : invoice.status === 'pending'
                ? 'bg-yellow-600'
                : invoice.status === 'overdue'
                ? 'bg-red-600'
                : 'bg-gray-600'
            }`}>
              {invoice.status === 'paid' ? (
                <CheckCircle2 className="h-8 w-8 text-white" />
              ) : (
                <ShoppingBag className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {invoice.status === 'paid'
                  ? 'Payment Successful!'
                  : invoice.status === 'pending'
                  ? 'Payment Pending'
                  : invoice.status === 'overdue'
                  ? 'Payment Overdue'
                  : 'Invoice'
                }
              </h2>
              <p className="text-gray-700">
                {invoice.status === 'paid'
                  ? `Your payment has been processed successfully. ${invoice.buyer_info ? `A confirmation email has been sent to ${invoice.buyer_info.email}` : ''}`
                  : invoice.status === 'pending'
                  ? `Please complete your payment by ${new Date(invoice.due_date).toLocaleDateString()}.`
                  : invoice.status === 'overdue'
                  ? `This payment was due on ${new Date(invoice.due_date).toLocaleDateString()}. Please complete your payment as soon as possible.`
                  : 'Your invoice is ready for viewing.'
                }
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Badge>
              {invoice.status === 'pending' && (
                <Button onClick={handlePayNow} className="bg-blue-600 hover:bg-blue-700">
                  Pay Now
                </Button>
              )}
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
              <Badge className={`${getStatusColor(invoice.status)} px-4 py-1.5 text-sm font-medium`}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between items-end text-white/90">
              <div className="space-y-1">
                <p className="text-sm">Invoice Number</p>
                <p className="text-lg font-semibold text-white">{invoice.invoice_number}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm">Invoice Date</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(invoice.created_at).toLocaleDateString()}
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
                  <p className="font-bold text-lg">AuctionFlow System</p>
                  <p className="text-sm">Payment Processing</p>
                  <p className="text-sm mt-2">System Generated</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Bill To</h3>
                <div className="text-gray-900">
                  {invoice.buyer_info ? (
                    <>
                      <p className="font-bold text-lg">{invoice.buyer_info.name}</p>
                      <p className="text-sm">{invoice.buyer_info.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-lg">Customer</p>
                      <p className="text-sm">Buyer information available in system</p>
                    </>
                  )}
                  <p className="text-sm mt-2">
                    <span className="text-gray-600">Invoice ID:</span> {invoice.id}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Invoice Information */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Invoice Details</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Due Date</p>
                  <p className="font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Buyer's Premium</p>
                  <p className="font-semibold text-gray-900">{(invoice.buyers_premium_rate * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Tax Rate</p>
                  <p className="font-semibold text-gray-900">{(invoice.tax_rate * 100).toFixed(2)}%</p>
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
                    {invoice.items.map((item) => {
                      // Calculate proportional premium and tax for each item
                      const premiumRatio = parseFloat(item.unit_price.toString()) / invoice.subtotal;
                      const itemPremium = invoice.buyers_premium_amount * premiumRatio;
                      const itemTax = invoice.tax_amount * premiumRatio;
                      const itemTotal = parseFloat(item.total_price.toString()) + itemPremium + itemTax;

                      return (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-4 px-2 text-sm font-medium text-gray-900">{item.lot_id}</td>
                          <td className="py-4 px-2 text-sm text-gray-900">{item.title}</td>
                          <td className="py-4 px-2 text-sm text-right text-gray-900">{formatCurrency(parseFloat(item.unit_price.toString()))}</td>
                          <td className="py-4 px-2 text-sm text-right text-gray-900">{formatCurrency(itemPremium)}</td>
                          <td className="py-4 px-2 text-sm text-right text-gray-900">{formatCurrency(itemTax)}</td>
                          <td className="py-4 px-2 text-sm text-right font-semibold text-gray-900">
                            {formatCurrency(itemTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal (Bids)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totals.bids)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Buyer's Premium</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totals.premium)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sales Tax</span>
                  <span className="font-medium text-gray-900">{formatCurrency(totals.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between pt-2">
                  <span className="text-lg font-bold text-gray-900">
                    {invoice.status === 'paid' ? 'Total Paid' : 'Total Due'}
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            {invoice.status === 'paid' && (
              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-3">Payment Information</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Payment Method</p>
                    <p className="font-semibold text-gray-900">Credit Card</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Transaction ID</p>
                  <p className="font-semibold text-gray-900">{invoice.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Date</p>
                  <p className="font-semibold text-gray-900">
                    {invoice.updated_at ? new Date(invoice.updated_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Payment Confirmed</Badge>
                </div>
              </div>
            </div>
            )}

            {/* Footer Note */}
            <div className="mt-8 pt-8 border-t text-center">
              <p className="text-sm text-gray-600">
                Thank you for your purchase! For questions, please contact us at{" "}
                <a href="mailto:support@auctionflow.com" className="text-blue-600 hover:underline">
                  support@auctionflow.com
                </a>
              </p>
              <p className="text-xs text-gray-500 mt-2">This is an official invoice from AuctionFlow System</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
