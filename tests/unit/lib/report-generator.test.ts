import {
  ReportGenerator,
  ReportScheduler,
  ExportConfig,
  defaultExportConfig,
} from '@/lib/report-generator';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Mock dependencies
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
      getNumberOfPages: () => 3,
    },
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    text: jest.fn(),
    addPage: jest.fn(),
    output: jest.fn().mockReturnValue('mock-pdf-blob'),
  }));
});

jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-15 10:30:00'),
}));

import autoTable from 'jspdf-autotable';

describe('Report Generator Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReportGenerator.generatePDFReport()', () => {
    const mockReportData = {
      title: 'Test Revenue Report',
      dateRange: 'Jan 1 - Jan 31, 2024',
      generatedAt: new Date('2024-01-15T10:30:00Z'),
      data: {
        summary: {
          totalRevenue: 125000,
          totalTransactions: 150,
          avgTransactionValue: 833.33,
          growthRate: 15.5,
          completionRate: 92.5,
        },
        breakdowns: {
          paymentMethods: [
            {
              method: 'card',
              count: 120,
              totalAmount: 100000,
              avgAmount: 833.33,
            },
            {
              method: 'ach',
              count: 30,
              totalAmount: 25000,
              avgAmount: 833.33,
            },
          ],
          status: [
            {
              status: 'completed',
              count: 140,
              totalAmount: 120000,
              avgAmount: 857.14,
            },
            {
              status: 'pending',
              count: 10,
              totalAmount: 5000,
              avgAmount: 500,
            },
          ],
        },
      },
    };

    it('should generate a PDF report successfully', async () => {
      const blob = await ReportGenerator.generatePDFReport(mockReportData);

      expect(jsPDF).toHaveBeenCalled();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should include title and metadata', async () => {
      const mockDoc = new jsPDF();
      const mockText = jest.fn();
      mockDoc.text = mockText;
      (jsPDF as jest.Mock).mockReturnValue(mockDoc);

      await ReportGenerator.generatePDFReport(mockReportData);

      expect(mockText).toHaveBeenCalledWith(
        mockReportData.title,
        expect.any(Number), // pageWidth / 2
        20, // yPosition
        { align: 'center' }
      );

      expect(mockText).toHaveBeenCalledWith(
        `Date Range: ${mockReportData.dateRange}`,
        expect.any(Number),
        30, // yPosition + 10
        { align: 'center' }
      );
    });

    it('should include revenue summary table', async () => {
      await ReportGenerator.generatePDFReport(mockReportData);

      expect(autoTable).toHaveBeenCalledWith(
        expect.any(Object), // doc
        expect.objectContaining({
          head: [['Metric', 'Value']],
          body: expect.arrayContaining([
            ['Total Revenue', '$125,000'],
            ['Total Transactions', '150'],
            ['Average Transaction Value', '$833.33'],
            ['Growth Rate', '15.5%'],
            ['Completion Rate', '92.5%'],
          ]),
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        })
      );
    });

    it('should include payment methods breakdown', async () => {
      await ReportGenerator.generatePDFReport(mockReportData);

      expect(autoTable).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          head: [['Payment Method', 'Transactions', 'Total Amount', 'Average']],
          body: expect.arrayContaining([
            ['CARD', '120', '$100,000', '$833.33'],
            ['ACH', '30', '$25,000', '$833.33'],
          ]),
          headStyles: { fillColor: [16, 185, 129] },
        })
      );
    });

    it('should include status breakdown', async () => {
      await ReportGenerator.generatePDFReport(mockReportData);

      expect(autoTable).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          head: [['Status', 'Count', 'Total Amount', 'Average Amount']],
          body: expect.arrayContaining([
            ['COMPLETED', '140', '$120,000', '$857.14'],
            ['PENDING', '10', '$5,000', '$500.00'],
          ]),
          headStyles: { fillColor: [245, 158, 11] },
        })
      );
    });

    it('should handle missing summary data', async () => {
      const reportWithoutSummary = {
        ...mockReportData,
        data: {},
      };

      const blob = await ReportGenerator.generatePDFReport(reportWithoutSummary);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle missing breakdowns', async () => {
      const reportWithoutBreakdowns = {
        ...mockReportData,
        data: {
          summary: mockReportData.data.summary,
        },
      };

      const blob = await ReportGenerator.generatePDFReport(reportWithoutBreakdowns);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should format currency correctly', async () => {
      const reportWithLargeNumbers = {
        ...mockReportData,
        data: {
          summary: {
            totalRevenue: 1234567890,
            totalTransactions: 1000000,
            avgTransactionValue: 1234.56789,
            growthRate: 5.5,
            completionRate: 95.5,
          },
        },
      };

      await ReportGenerator.generatePDFReport(reportWithLargeNumbers);

      expect(autoTable).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          body: expect.arrayContaining([
            ['Total Revenue', '$1,234,567,890'],
            ['Average Transaction Value', '$1,234.57'],
          ]),
        })
      );
    });

    it('should include page numbers in footer', async () => {
      const mockDoc = new jsPDF();
      mockDoc.internal.getNumberOfPages = jest.fn().mockReturnValue(3);
      const mockText = jest.fn();
      mockDoc.text = mockText;
      mockDoc.setPage = jest.fn();
      mockDoc.setFontSize = jest.fn();
      mockDoc.getFont = jest.fn().mockReturnValue({ fontName: 'helvetica' });
      (jsPDF as jest.Mock).mockReturnValue(mockDoc);

      await ReportGenerator.generatePDFReport(mockReportData);

      expect(mockDoc.setPage).toHaveBeenCalledTimes(3); // For each page
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Page 1 of 3'),
        expect.any(Number),
        expect.any(Number),
        { align: 'center' }
      );
    });
  });

  describe('ReportGenerator.generateCSVReport()', () => {
    const mockReportData = {
      title: 'Test Revenue Report',
      dateRange: 'Jan 1 - Jan 31, 2024',
      generatedAt: new Date('2024-01-15T10:30:00Z'),
      data: {
        summary: {
          totalRevenue: 125000,
          totalTransactions: 150,
          avgTransactionValue: 833.33,
          growthRate: 15.5,
          completionRate: 92.5,
        },
        breakdowns: {
          paymentMethods: [
            {
              method: 'card',
              count: 120,
              totalAmount: 100000,
              avgAmount: 833.33,
            },
          ],
          status: [
            {
              status: 'completed',
              count: 140,
              totalAmount: 120000,
              avgAmount: 857.14,
            },
          ],
        },
      },
    };

    it('should generate CSV report successfully', () => {
      const csv = ReportGenerator.generateCSVReport(mockReportData);

      expect(csv).toContain(mockReportData.title);
      expect(csv).toContain('Date Range: Jan 1 - Jan 31, 2024');
      expect(csv).toContain('Generated: 2024-01-15 10:30:00');
    });

    it('should include revenue summary in CSV', () => {
      const csv = ReportGenerator.generateCSVReport(mockReportData);

      expect(csv).toContain('REVENUE SUMMARY');
      expect(csv).toContain('Metric,Value');
      expect(csv).toContain('Total Revenue,$125000');
      expect(csv).toContain('Total Transactions,150');
      expect(csv).toContain('Average Transaction Value,$833.33');
      expect(csv).toContain('Growth Rate,15.5%');
      expect(csv).toContain('Completion Rate,92.5%');
    });

    it('should include payment methods in CSV', () => {
      const csv = ReportGenerator.generateCSVReport(mockReportData);

      expect(csv).toContain('PAYMENT METHODS');
      expect(csv).toContain('Payment Method,Transactions,Total Amount,Average Amount');
      expect(csv).toContain('card,120,100000,833.33');
    });

    it('should include status breakdown in CSV', () => {
      const csv = ReportGenerator.generateCSVReport(mockReportData);

      expect(csv).toContain('TRANSACTION STATUS');
      expect(csv).toContain('Status,Count,Total Amount,Average Amount');
      expect(csv).toContain('completed,140,120000,857.14');
    });

    it('should handle missing data gracefully', () => {
      const emptyReport = {
        title: 'Empty Report',
        dateRange: 'No data',
        generatedAt: new Date(),
        data: {},
      };

      const csv = ReportGenerator.generateCSVReport(emptyReport);

      expect(csv).toContain('Empty Report');
      expect(csv).toContain('Date Range: No data');
    });
  });

  describe('ReportGenerator.downloadFile()', () => {
    let mockDocument: Document;

    beforeEach(() => {
      // Mock DOM methods
      mockDocument = {
        createElement: jest.fn().mockReturnValue({
          href: '',
          download: '',
          click: jest.fn(),
        }),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      } as any;

      global.document = mockDocument;
      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob-url'),
        revokeObjectURL: jest.fn(),
      } as any;
    });

    it('should download file correctly', () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' });
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      (mockDocument.createElement as jest.Mock).mockReturnValue(mockLink);
      (global.URL.createObjectURL as jest.Mock).mockReturnValue('mock-url');

      ReportGenerator.downloadFile(mockBlob, 'test-file.txt');

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('mock-url');
      expect(mockLink.download).toBe('test-file.txt');
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('ReportGenerator.generateAndDownloadReport()', () => {
    beforeEach(() => {
      // Mock DOM and URL APIs
      global.document = {
        createElement: jest.fn().mockReturnValue({
          href: '',
          download: '',
          click: jest.fn(),
        }),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
      } as any;

      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob-url'),
        revokeObjectURL: jest.fn(),
      } as any;

      // Mock date formatting
      (format as jest.Mock).mockReturnValue('2024-01-15_10-30-00');
    });

    it('should generate and download PDF report', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      jest.spyOn(ReportGenerator, 'generatePDFReport').mockResolvedValue(mockBlob);
      jest.spyOn(ReportGenerator, 'downloadFile').mockImplementation();

      const reportData = {
        title: 'Test Revenue Report',
        dateRange: 'Jan 2024',
        generatedAt: new Date(),
        data: {},
      };

      await ReportGenerator.generateAndDownloadReport(reportData, 'pdf');

      expect(ReportGenerator.generatePDFReport).toHaveBeenCalledWith(reportData);
      expect(ReportGenerator.downloadFile).toHaveBeenCalledWith(
        mockBlob,
        'Test_Revenue_Report_2024-01-15_10-30-00.pdf'
      );
    });

    it('should generate and download CSV report', async () => {
      const csvContent = 'test,csv,content';
      jest.spyOn(ReportGenerator, 'generateCSVReport').mockReturnValue(csvContent);
      jest.spyOn(ReportGenerator, 'downloadFile').mockImplementation();

      const reportData = {
        title: 'Test Report',
        dateRange: 'Jan 2024',
        generatedAt: new Date(),
        data: {},
      };

      await ReportGenerator.generateAndDownloadReport(reportData, 'csv');

      expect(ReportGenerator.generateCSVReport).toHaveBeenCalledWith(reportData);
      expect(ReportGenerator.downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'Test_Report_2024-01-15_10-30-00.csv'
      );
    });
  });

  describe('ReportScheduler', () => {
    describe('generateDailySchedule()', () => {
      it('should generate daily schedule configuration', () => {
        const schedule = ReportScheduler.generateDailySchedule();

        expect(schedule).toEqual({
          enabled: true,
          time: '09:00',
          formats: ['pdf', 'csv'],
        });
      });
    });

    describe('generateWeeklySchedule()', () => {
      it('should generate weekly schedule configuration', () => {
        const schedule = ReportScheduler.generateWeeklySchedule();

        expect(schedule).toEqual({
          enabled: true,
          day: 'monday',
          time: '09:00',
          formats: ['pdf'],
        });
      });
    });

    describe('generateMonthlySchedule()', () => {
      it('should generate monthly schedule configuration', () => {
        const schedule = ReportScheduler.generateMonthlySchedule();

        expect(schedule).toEqual({
          enabled: true,
          day: 1,
          time: '09:00',
          formats: ['pdf', 'csv'],
        });
      });
    });

    describe('generateEmailRecipients()', () => {
      it('should generate email recipients list', () => {
        const recipients = ReportScheduler.generateEmailRecipients();

        expect(recipients).toEqual([
          'admin@hibid.com',
          'finance@hibid.com',
          'operations@hibid.com',
        ]);
      });

      it('should return array of strings', () => {
        const recipients = ReportScheduler.generateEmailRecipients();

        expect(Array.isArray(recipients)).toBe(true);
        expect(recipients.every(email => typeof email === 'string')).toBe(true);
        expect(recipients.every(email => email.includes('@'))).toBe(true);
      });
    });
  });

  describe('Export Configuration', () => {
    describe('defaultExportConfig', () => {
      it('should have correct default configuration', () => {
        expect(defaultExportConfig).toEqual({
          includeSummary: true,
          includeBreakdowns: true,
          includeCharts: false,
          includeTransactions: false,
          dateRange: {},
        });
      });
    });

    describe('ExportConfig interface', () => {
      it('should accept valid configuration', () => {
        const config: ExportConfig = {
          includeSummary: true,
          includeBreakdowns: true,
          includeCharts: true,
          includeTransactions: true,
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        };

        expect(config.includeSummary).toBe(true);
        expect(config.includeCharts).toBe(true);
        expect(config.includeTransactions).toBe(true);
        expect(config.dateRange.startDate).toBe('2024-01-01');
        expect(config.dateRange.endDate).toBe('2024-01-31');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors', async () => {
      const mockDoc = new jsPDF();
      mockDoc.internal.pageSize.getWidth = jest.fn().mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      (jsPDF as jest.Mock).mockReturnValue(mockDoc);

      const reportData = {
        title: 'Test Report',
        dateRange: 'Jan 2024',
        generatedAt: new Date(),
        data: {
          summary: {
            totalRevenue: 100000,
            totalTransactions: 100,
            avgTransactionValue: 1000,
            growthRate: 10,
            completionRate: 95,
          },
        },
      };

      await expect(ReportGenerator.generatePDFReport(reportData)).rejects.toThrow(
        'PDF generation failed'
      );
    });

    it('should handle report data with null values', () => {
      const reportWithNulls = {
        title: 'Report with Nulls',
        dateRange: 'Jan 2024',
        generatedAt: new Date(),
        data: {
          summary: {
            totalRevenue: null,
            totalTransactions: 0,
            avgTransactionValue: undefined,
            growthRate: 0,
            completionRate: null,
          },
        },
      };

      expect(() => {
        ReportGenerator.generateCSVReport(reportWithNulls);
      }).not.toThrow();
    });
  });
});