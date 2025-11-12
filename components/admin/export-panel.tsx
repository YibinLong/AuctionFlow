'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportGenerator, ReportScheduler, type ExportConfig, defaultExportConfig } from '@/lib/report-generator';
import { format as formatDate, subDays } from 'date-fns';
import {
  Download,
  Calendar,
  FileText,
  Table,
  Settings,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

interface ExportPanelProps {
  revenueData?: any;
  transactionData?: any;
  settlementData?: any;
  onExport?: (format: string, config: ExportConfig) => void;
}

export function ExportPanel({ revenueData, transactionData, settlementData, onExport }: ExportPanelProps) {
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultExportConfig);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [emailRecipients, setEmailRecipients] = useState<string[]>(ReportScheduler.generateEmailRecipients());
  const [emailInput, setEmailInput] = useState('');

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!revenueData || !transactionData) return;

    setIsExporting(format);
    try {
      const endDate = new Date();
      const startDate = exportConfig.dateRange.startDate
        ? new Date(exportConfig.dateRange.startDate)
        : subDays(endDate, 30);

      const reportData = {
        title: 'AuctionFlow Analytics Report',
        dateRange: `${formatDate(startDate, 'MMM dd, yyyy')} - ${formatDate(endDate, 'MMM dd, yyyy')}`,
        generatedAt: new Date(),
        data: {
          summary: {
            ...revenueData.summary,
            completionRate: transactionData.summary.completionRate
          },
          breakdowns: {
            ...transactionData.breakdowns
          }
        }
      };

      await ReportGenerator.generateAndDownloadReport(reportData, format);
      onExport?.(format, exportConfig);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const addEmailRecipient = () => {
    if (emailInput && emailInput.includes('@') && !emailRecipients.includes(emailInput)) {
      setEmailRecipients([...emailRecipients, emailInput]);
      setEmailInput('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    setEmailRecipients(emailRecipients.filter(e => e !== email));
  };

  const getExportSummary = () => {
    return {
      totalRevenue: revenueData?.summary?.totalRevenue || 0,
      totalTransactions: transactionData?.summary?.totalCount || 0,
      completionRate: transactionData?.summary?.completionRate || 0,
      dateRange: exportConfig.dateRange.startDate && exportConfig.dateRange.endDate
        ? `${formatDate(new Date(exportConfig.dateRange.startDate), 'MMM dd')} - ${formatDate(new Date(exportConfig.dateRange.endDate), 'MMM dd')}`
        : 'Last 30 days'
    };
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Reports
            </CardTitle>
            <CardDescription>
              Generate comprehensive reports for analytics and compliance
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="schedule">Schedule Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {/* Export Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-4 w-4" />
                  Report Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      ${getExportSummary().totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-700">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {getExportSummary().totalTransactions}
                    </p>
                    <p className="text-sm text-green-700">Transactions</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {getExportSummary().completionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-purple-700">Completion Rate</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">
                      {getExportSummary().dateRange}
                    </p>
                    <p className="text-sm text-orange-700">Date Range</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={exportConfig.dateRange.startDate || ''}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, startDate: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={exportConfig.dateRange.endDate || ''}
                      onChange={(e) => setExportConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, endDate: e.target.value }
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Export Format */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-4 w-4" />
                    Export Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleExport('pdf')}
                      disabled={isExporting === 'pdf' || !revenueData || !transactionData}
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      variant="outline"
                    >
                      <FileText className="h-8 w-8" />
                      <span className="text-sm">PDF Report</span>
                      {isExporting === 'pdf' && (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      )}
                    </Button>
                    <Button
                      onClick={() => handleExport('csv')}
                      disabled={isExporting === 'csv' || !revenueData || !transactionData}
                      className="h-24 flex flex-col items-center justify-center gap-2"
                      variant="outline"
                    >
                      <Table className="h-8 w-8" />
                      <span className="text-sm">CSV Data</span>
                      {isExporting === 'csv' && (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF: Formatted report with charts and summaries<br/>
                    CSV: Raw data for Excel/analysis
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Daily Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-4 w-4" />
                    Daily Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enable Daily</span>
                    <Badge variant={ReportScheduler.generateDailySchedule().enabled ? "default" : "secondary"}>
                      {ReportScheduler.generateDailySchedule().enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Time: {ReportScheduler.generateDailySchedule().time}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Formats: {ReportScheduler.generateDailySchedule().formats.join(', ').toUpperCase()}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-4 w-4" />
                    Weekly Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enable Weekly</span>
                    <Badge variant={ReportScheduler.generateWeeklySchedule().enabled ? "default" : "secondary"}>
                      {ReportScheduler.generateWeeklySchedule().enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ReportScheduler.generateWeeklySchedule().day.charAt(0).toUpperCase() + ReportScheduler.generateWeeklySchedule().day.slice(1)} at {ReportScheduler.generateWeeklySchedule().time}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Formats: {ReportScheduler.generateWeeklySchedule().formats.join(', ').toUpperCase()}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-4 w-4" />
                    Monthly Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enable Monthly</span>
                    <Badge variant={ReportScheduler.generateMonthlySchedule().enabled ? "default" : "secondary"}>
                      {ReportScheduler.generateMonthlySchedule().enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Day {ReportScheduler.generateMonthlySchedule().day} at {ReportScheduler.generateMonthlySchedule().time}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Formats: {ReportScheduler.generateMonthlySchedule().formats.join(', ').toUpperCase()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Email Recipients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-4 w-4" />
                  Email Recipients
                </CardTitle>
                <CardDescription>
                  Emails will be sent to these recipients when scheduled reports are generated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add email address..."
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                  />
                  <Button onClick={addEmailRecipient} disabled={!emailInput.includes('@')}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emailRecipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => removeEmailRecipient(email)}
                        className="ml-1 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Note: Email delivery requires server-side implementation
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-4 w-4" />
                  Export Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Include in Reports</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeSummary}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          includeSummary: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Revenue Summary</span>
                    </Label>
                    <Label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeBreakdowns}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          includeBreakdowns: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Payment Breakdowns</span>
                    </Label>
                    <Label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeCharts}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          includeCharts: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Include Charts</span>
                    </Label>
                    <Label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={exportConfig.includeTransactions}
                        onChange={(e) => setExportConfig(prev => ({
                          ...prev,
                          includeTransactions: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Transaction Details</span>
                    </Label>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <h4 className="font-medium mb-2">Export Information</h4>
                  <ul className="space-y-1">
                    <li>• PDF reports include formatted tables and summaries</li>
                    <li>• CSV exports provide raw data for analysis</li>
                    <li>• Reports are generated client-side for security</li>
                    <li>• Large datasets may take time to process</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}