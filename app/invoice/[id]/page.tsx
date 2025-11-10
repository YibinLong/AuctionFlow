import { InvoiceContent } from "@/components/invoice/invoice-content"

export const metadata = {
  title: "Invoice - HiBid Auction",
  description: "Your purchase confirmation and invoice",
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  return <InvoiceContent invoiceId={params.id} />
}
