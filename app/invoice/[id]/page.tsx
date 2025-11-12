import { InvoiceContent } from "@/components/invoice/invoice-content"

export const metadata = {
  title: "Invoice - HiBid Auction",
  description: "Your purchase confirmation and invoice",
}

export async function generateStaticParams() {
  // For static export, return sample invoice IDs
  // In production, this should return valid invoice IDs
  return [
    { id: 'sample1' },
    { id: 'sample2' },
    { id: 'sample3' }
  ]
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceContent invoiceId={id} />
}
