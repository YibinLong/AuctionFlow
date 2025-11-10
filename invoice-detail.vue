<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white py-8 px-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header Actions -->
      <div class="flex items-center justify-between mb-6">
        <button class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft class="w-5 h-5" />
          <span class="font-medium">Back to Dashboard</span>
        </button>
        <div class="flex items-center gap-3">
          <button class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download class="w-4 h-4" />
            <span class="font-medium text-gray-700">Download PDF</span>
          </button>
          <button class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md">
            <Send class="w-4 h-4" />
            <span class="font-medium">Send to Buyer</span>
          </button>
        </div>
      </div>

      <!-- Invoice Card -->
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <!-- Invoice Header -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Gavel class="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 class="text-2xl font-bold">HiBid Auctions</h1>
                  <p class="text-blue-100 text-sm">Premium Auction Services</p>
                </div>
              </div>
              <div class="text-blue-50 text-sm space-y-1">
                <p>2450 Commerce Drive, Suite 100</p>
                <p>Denver, CO 80202</p>
                <p>support@hibid.com | (555) 123-4567</p>
              </div>
            </div>
            <div class="text-right">
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-lg mb-4">
                <CheckCircle2 class="w-5 h-5 text-green-300" />
                <span class="font-semibold">PAID</span>
              </div>
              <h2 class="text-3xl font-bold mb-2">INVOICE</h2>
              <p class="text-blue-100">#INV-2024-8472</p>
            </div>
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="px-8 py-6 bg-gray-50 border-b border-gray-100">
          <div class="grid md:grid-cols-3 gap-6">
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
              <p class="font-bold text-gray-900">{{ invoice.buyer.name }}</p>
              <p class="text-sm text-gray-600 mt-1">{{ invoice.buyer.email }}</p>
              <p class="text-sm text-gray-600">{{ invoice.buyer.phone }}</p>
              <p class="text-sm text-gray-600 mt-2">{{ invoice.buyer.address }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Auction Details</p>
              <p class="text-sm text-gray-900"><span class="font-medium">Event:</span> {{ invoice.auction.name }}</p>
              <p class="text-sm text-gray-900 mt-1"><span class="font-medium">Date:</span> {{ invoice.auction.date }}</p>
              <p class="text-sm text-gray-900 mt-1"><span class="font-medium">Location:</span> {{ invoice.auction.location }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Info</p>
              <p class="text-sm text-gray-900"><span class="font-medium">Method:</span> {{ invoice.payment.method }}</p>
              <p class="text-sm text-gray-900 mt-1"><span class="font-medium">Date:</span> {{ invoice.payment.date }}</p>
              <p class="text-sm text-gray-900 mt-1"><span class="font-medium">Transaction:</span> {{ invoice.payment.transactionId }}</p>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="px-8 py-6">
          <h3 class="text-lg font-bold text-gray-900 mb-4">Items Purchased</h3>
          <div class="overflow-hidden rounded-xl border border-gray-200">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lot #</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Winning Bid</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Premium (15%)</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white">
                <tr v-for="item in invoice.items" :key="item.lotNumber" class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-4 text-sm font-mono text-gray-900">{{ item.lotNumber }}</td>
                  <td class="px-4 py-4">
                    <p class="text-sm font-medium text-gray-900">{{ item.description }}</p>
                    <p class="text-xs text-gray-500 mt-1">{{ item.category }}</p>
                  </td>
                  <td class="px-4 py-4 text-sm text-right text-gray-900 font-medium">${{ item.winningBid.toLocaleString() }}</td>
                  <td class="px-4 py-4 text-sm text-right text-gray-600">${{ item.premium.toLocaleString() }}</td>
                  <td class="px-4 py-4 text-sm text-right text-gray-900 font-semibold">${{ item.total.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals -->
        <div class="px-8 pb-8">
          <div class="max-w-md ml-auto space-y-3">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span class="font-medium">${{ invoice.subtotal.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Buyer's Premium (15%)</span>
              <span class="font-medium">${{ invoice.buyersPremium.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Sales Tax (8.5%)</span>
              <span class="font-medium">${{ invoice.salesTax.toLocaleString() }}</span>
            </div>
            <div class="h-px bg-gray-200" />
            <div class="flex justify-between items-center pt-2">
              <span class="text-lg font-bold text-gray-900">Total Amount</span>
              <span class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                ${{ invoice.total.toLocaleString() }}
              </span>
            </div>
            <div class="flex items-center gap-2 justify-end text-sm text-green-600 font-medium pt-2">
              <CheckCircle2 class="w-5 h-5" />
              <span>Payment Received</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-gray-50 border-t border-gray-100">
          <div class="flex items-start gap-3 text-sm text-gray-600">
            <Info class="w-5 h-5 flex-shrink-0 text-blue-600" />
            <div>
              <p class="font-medium text-gray-900 mb-1">Payment Terms & Conditions</p>
              <p class="text-xs leading-relaxed">
                All sales are final. Items must be picked up within 7 days of auction close. 
                A 15% buyer's premium and applicable sales tax are added to all winning bids. 
                For questions regarding this invoice, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Trail -->
      <div class="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText class="w-5 h-5 text-blue-600" />
          Audit Trail
        </h3>
        <div class="space-y-3">
          <div v-for="log in auditLog" :key="log.id" class="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
            <div class="flex-shrink-0 w-2 h-2 rounded-full" :class="log.dotColor" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ log.action }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ log.user }} • {{ log.timestamp }}</p>
            </div>
            <component :is="log.icon" class="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Gavel, ArrowLeft, Download, Send, CheckCircle2, Info, FileText, Clock, CreditCard, Mail } from 'lucide-vue-next'

const invoice = ref({
  buyer: {
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '(555) 987-6543',
    address: '789 Collector Lane, Austin, TX 73301'
  },
  auction: {
    name: 'Spring Estate Auction 2024',
    date: 'May 15, 2024',
    location: 'Denver Convention Center'
  },
  payment: {
    method: 'Visa ****4532',
    date: 'May 15, 2024 at 3:42 PM',
    transactionId: 'TXN-2024-8472'
  },
  items: [
    {
      lotNumber: '1247',
      description: 'Vintage Rolex Submariner Watch',
      category: 'Jewelry & Watches',
      winningBid: 8500,
      premium: 1275,
      total: 9775
    },
    {
      lotNumber: '1248',
      description: 'Antique Oak Desk with Brass Hardware',
      category: 'Furniture',
      winningBid: 2400,
      premium: 360,
      total: 2760
    },
    {
      lotNumber: '1249',
      description: 'Oil Painting - Coastal Landscape',
      category: 'Fine Art',
      winningBid: 3200,
      premium: 480,
      total: 3680
    }
  ],
  subtotal: 14100,
  buyersPremium: 2115,
  salesTax: 1378,
  total: 17593
})

const auditLog = ref([
  {
    id: 1,
    action: 'Invoice Generated',
    user: 'System',
    timestamp: 'May 15, 2024 at 3:40 PM',
    icon: FileText,
    dotColor: 'bg-blue-500'
  },
  {
    id: 2,
    action: 'Payment Processed',
    user: 'Sarah Mitchell',
    timestamp: 'May 15, 2024 at 3:42 PM',
    icon: CreditCard,
    dotColor: 'bg-green-500'
  },
  {
    id: 3,
    action: 'Invoice Sent to Buyer',
    user: 'System',
    timestamp: 'May 15, 2024 at 3:43 PM',
    icon: Mail,
    dotColor: 'bg-purple-500'
  },
  {
    id: 4,
    action: 'Payment Confirmed',
    user: 'Payment Gateway',
    timestamp: 'May 15, 2024 at 3:44 PM',
    icon: CheckCircle2,
    dotColor: 'bg-green-500'
  }
])
</script>
