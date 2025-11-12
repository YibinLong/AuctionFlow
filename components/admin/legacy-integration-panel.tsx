'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LegacyDataIntegrator, LegacyIntegrationMonitor, type LegacyDataImport } from '@/lib/legacy-integration';
import { format, subDays } from 'date-fns';
import {
  Database,
  RefreshCw as Sync,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  FileText,
  Server,
  Download,
  Activity
} from 'lucide-react';

export function LegacyIntegrationPanel() {
  const [isImporting, setIsImporting] = useState<'foxpro' | 'sqlserver' | null>(null);
  const [importResults, setImportResults] = useState<LegacyDataImport[]>([]);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [integrationHealth, setIntegrationHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrationData();
  }, []);

  const loadIntegrationData = async () => {
    setLoading(true);
    try {
      const [stats, health] = await Promise.all([
        LegacyDataIntegrator.getSyncStatistics(),
        LegacyIntegrationMonitor.getIntegrationHealth()
      ]);
      setSyncStats(stats);
      setIntegrationHealth(health);
    } catch (error) {
      console.error('Failed to load integration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (source: 'foxpro' | 'sqlserver') => {
    setIsImporting(source);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 365); // Import last year of data

      const result = await LegacyDataIntegrator[`importFrom${source === 'foxpro' ? 'FoxPro' : 'SQLServer'}`](startDate, endDate);
      setImportResults(prev => [result, ...prev]);
      await loadIntegrationData(); // Refresh stats
    } catch (error) {
      console.error(`Failed to import from ${source}:`, error);
    } finally {
      setIsImporting(null);
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading legacy integration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Health
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getHealthColor(integrationHealth?.status)}>
                {getHealthIcon(integrationHealth?.status)}
                <span className="ml-1 capitalize">{integrationHealth?.status}</span>
              </Badge>
              <Badge variant="outline">
                Score: {integrationHealth?.score}/100
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{syncStats?.totalLegacyItems || 0}</p>
              <p className="text-sm text-blue-700">Legacy Items</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{syncStats?.totalLegacyResults || 0}</p>
              <p className="text-sm text-green-700">Legacy Results</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(syncStats?.itemsBySource || {}).length}
              </p>
              <p className="text-sm text-purple-700">Data Sources</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {integrationHealth?.validation?.orphanedResults || 0}
              </p>
              <p className="text-sm text-orange-700">Issues Found</p>
            </div>
          </div>

          {/* Recommendations */}
          {integrationHealth?.recommendations?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recommendations</h4>
              {integrationHealth.recommendations.map((rec: any, index: number) => (
                <Alert key={index} className={rec.type === 'error' ? 'border-red-200' : rec.type === 'warning' ? 'border-yellow-200' : 'border-green-200'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{rec.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="status">Sync Status</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        {/* Data Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FoxPro Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  FoxPro Import
                </CardTitle>
                <CardDescription>
                  Import historical auction items from FoxPro database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Import auction items and descriptions</p>
                  <p>• Migrate categories and valuations</p>
                  <p>• Preserve metadata and images</p>
                </div>
                <Button
                  onClick={() => handleImport('foxpro')}
                  disabled={isImporting === 'foxpro'}
                  className="w-full"
                >
                  {isImporting === 'foxpro' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import FoxPro Data
                    </>
                  )}
                </Button>
                {syncStats?.itemsBySource?.foxpro && (
                  <div className="text-center">
                    <Badge variant="outline">
                      {syncStats.itemsBySource.foxpro} items imported
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SQL Server Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  SQL Server Import
                </CardTitle>
                <CardDescription>
                  Import auction results and bidder data from SQL Server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>• Import auction results and sales</p>
                  <p>• Migrate bidder information</p>
                  <p>• Import payment data</p>
                </div>
                <Button
                  onClick={() => handleImport('sqlserver')}
                  disabled={isImporting === 'sqlserver'}
                  className="w-full"
                >
                  {isImporting === 'sqlserver' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import SQL Server Data
                    </>
                  )}
                </Button>
                {syncStats?.resultsBySource?.sqlserver && (
                  <div className="text-center">
                    <Badge variant="outline">
                      {syncStats.resultsBySource.sqlserver} results imported
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Import Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Import Configuration</CardTitle>
              <CardDescription>
                Configure data import settings and validation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Date Range</h4>
                  <p className="text-sm text-muted-foreground">
                    Import data from the last 12 months
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Validation</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable data validation and duplicate detection
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Batch Size</h4>
                  <p className="text-sm text-muted-foreground">
                    Process 100 records per batch
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Status Tab */}
        <TabsContent value="status" className="space-y-6">
          {/* Source Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Items by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(syncStats?.itemsBySource || {}).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{source}</span>
                      <Badge variant="outline">{String(count)} items</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Results by Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(syncStats?.resultsBySource || {}).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{source}</span>
                      <Badge variant="outline">{String(count)} results</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Validation */}
          <Card>
            <CardHeader>
              <CardTitle>Data Validation Results</CardTitle>
              <CardDescription>
                Last validation: {format(new Date(), 'PPP p')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {integrationHealth?.validation?.orphanedResults || 0}
                  </p>
                  <p className="text-sm text-red-700">Orphaned Results</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {integrationHealth?.validation?.missingMetadata || 0}
                  </p>
                  <p className="text-sm text-yellow-700">Missing Metadata</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {integrationHealth?.validation?.invalidAmounts || 0}
                  </p>
                  <p className="text-sm text-orange-700">Invalid Amounts</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {integrationHealth?.validation?.duplicates || 0}
                  </p>
                  <p className="text-sm text-purple-700">Duplicates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Import History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importResults.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No import history available</p>
                  <p className="text-sm text-gray-500">Run an import to see history here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {importResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {result.source.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(result.startTime, 'PPP p')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {result.recordsImported}/{result.recordsProcessed} records
                          </span>
                          {result.errors.length === 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Duration: {Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)}s</span>
                        {result.errors.length > 0 && (
                          <span className="text-red-600">
                            {result.errors.length} errors
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}