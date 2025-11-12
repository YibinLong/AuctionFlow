import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format as formatDate } from 'date-fns';

export interface ReportData {
  title: string;
  dateRange: string;
  generatedAt: Date;
  data: any;
}

export class ReportGenerator {
  static async generatePDFReport(data: ReportData): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Range: ${data.dateRange}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 10;
    doc.text(`Generated: ${formatDate(data.generatedAt, 'PPP p')}`, pageWidth / 2, yPosition, { align: 'center' });

    yPosition += 20;

    // Revenue Summary
    if (data.data.summary) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Summary', 20, yPosition);
      yPosition += 10;

      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', `$${data.data.summary.totalRevenue?.toLocaleString() || 'N/A'}`],
        ['Total Transactions', data.data.summary.totalTransactions?.toString() || 'N/A'],
        ['Average Transaction Value', `$${data.data.summary.avgTransactionValue?.toFixed(2) || 'N/A'}`],
        ['Growth Rate', `${data.data.summary.growthRate?.toFixed(1) || 'N/A'}%`],
        ['Completion Rate', `${data.data.summary.completionRate?.toFixed(1) || 'N/A'}%`],
      ];

      autoTable(doc, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // Payment Methods Breakdown
    if (data.data.breakdowns?.paymentMethods) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Methods Breakdown', 20, yPosition);
      yPosition += 10;

      const paymentData = [
        ['Payment Method', 'Transactions', 'Total Amount', 'Average'],
        ...data.data.breakdowns.paymentMethods.map((method: any) => [
          method.method.replace('_', ' ').toUpperCase(),
          method.count.toString(),
          `$${method.totalAmount?.toLocaleString() || 'N/A'}`,
          `$${method.avgAmount?.toFixed(2) || 'N/A'}`
        ])
      ];

      autoTable(doc, {
        head: [paymentData[0]],
        body: paymentData.slice(1),
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    // Status Breakdown
    if (data.data.breakdowns?.status) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Status Breakdown', 20, yPosition);
      yPosition += 10;

      const statusData = [
        ['Status', 'Count', 'Total Amount', 'Average Amount'],
        ...data.data.breakdowns.status.map((status: any) => [
          status.status.toUpperCase(),
          status.count.toString(),
          `$${status.totalAmount?.toLocaleString() || 'N/A'}`,
          `$${status.avgAmount?.toFixed(2) || 'N/A'}`
        ])
      ];

      autoTable(doc, {
        head: [statusData[0]],
        body: statusData.slice(1),
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [245, 158, 11] },
      });
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${totalPages} | AuctionFlow Report`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  }

  static generateCSVReport(data: ReportData): string {
    let csv = '';

    // Header
    csv += `${data.title}\n`;
    csv += `Date Range: ${data.dateRange}\n`;
    csv += `Generated: ${formatDate(data.generatedAt, 'PPP p')}\n\n`;

    // Summary Section
    if (data.data.summary) {
      csv += 'REVENUE SUMMARY\n';
      csv += 'Metric,Value\n';
      csv += `Total Revenue,$${data.data.summary.totalRevenue || 'N/A'}\n`;
      csv += `Total Transactions,${data.data.summary.totalTransactions || 'N/A'}\n`;
      csv += `Average Transaction Value,$${data.data.summary.avgTransactionValue || 'N/A'}\n`;
      csv += `Growth Rate,${data.data.summary.growthRate || 'N/A'}%\n`;
      csv += `Completion Rate,${data.data.summary.completionRate || 'N/A'}%\n\n`;
    }

    // Payment Methods
    if (data.data.breakdowns?.paymentMethods) {
      csv += 'PAYMENT METHODS\n';
      csv += 'Payment Method,Transactions,Total Amount,Average Amount\n';
      data.data.breakdowns.paymentMethods.forEach((method: any) => {
        csv += `${method.method},${method.count},${method.totalAmount},${method.avgAmount}\n`;
      });
      csv += '\n';
    }

    // Status Breakdown
    if (data.data.breakdowns?.status) {
      csv += 'TRANSACTION STATUS\n';
      csv += 'Status,Count,Total Amount,Average Amount\n';
      data.data.breakdowns.status.forEach((status: any) => {
        csv += `${status.status},${status.count},${status.totalAmount},${status.avgAmount}\n`;
      });
    }

    return csv;
  }

  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async generateAndDownloadReport(
    data: ReportData,
    format: 'pdf' | 'csv'
  ): Promise<void> {
    const timestamp = formatDate(data.generatedAt, 'yyyy-MM-dd_HH-mm-ss');
    const filename = `${data.title.replace(/\s+/g, '_')}_${timestamp}`;

    if (format === 'pdf') {
      const pdfBlob = await this.generatePDFReport(data);
      this.downloadFile(pdfBlob, `${filename}.pdf`);
    } else {
      const csvContent = this.generateCSVReport(data);
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      this.downloadFile(csvBlob, `${filename}.csv`);
    }
  }
}

// Report scheduling utilities
export class ReportScheduler {
  static generateDailySchedule(): { enabled: boolean; time: string; formats: string[] } {
    return {
      enabled: true,
      time: '09:00',
      formats: ['pdf', 'csv']
    };
  }

  static generateWeeklySchedule(): { enabled: boolean; day: string; time: string; formats: string[] } {
    return {
      enabled: true,
      day: 'monday',
      time: '09:00',
      formats: ['pdf']
    };
  }

  static generateMonthlySchedule(): { enabled: boolean; day: number; time: string; formats: string[] } {
    return {
      enabled: true,
      day: 1,
      time: '09:00',
      formats: ['pdf', 'csv']
    };
  }

  static generateEmailRecipients(): string[] {
    return [
      'admin@hibid.com',
      'finance@hibid.com',
      'operations@hibid.com'
    ];
  }
}

// Export configurations
export interface ExportConfig {
  includeSummary: boolean;
  includeBreakdowns: boolean;
  includeCharts: boolean;
  includeTransactions: boolean;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

export const defaultExportConfig: ExportConfig = {
  includeSummary: true,
  includeBreakdowns: true,
  includeCharts: false, // Charts in PDF would require additional setup
  includeTransactions: false, // Large datasets might be better as separate exports
  dateRange: {}
};