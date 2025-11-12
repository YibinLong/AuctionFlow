"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Activity,
  Download,
  RefreshCw,
  Target,
  BarChart3,
  Zap,
  Shield,
  CreditCard,
  FileText
} from "lucide-react"

interface SuccessMetrics {
  timeframe: string;
  generated_at: string;
  checkout_performance: {
    avg_response_time_ms: number;
    total_requests: number;
    slow_requests: number;
    error_rate_percent: number;
    status: string;
  };
  payment_completion: {
    total_attempts: number;
    successful_payments: number;
    failed_payments: number;
    pending_payments: number;
    completion_rate_percent: number;
    goal_completion_rate_percent: number;
    status: string;
  };
  calculation_accuracy: {
    total_calculations: number;
    accurate_calculations: number;
    error_calculations: number;
    accuracy_rate_percent: number;
    goal_accuracy_percent: number;
    status: string;
  };
  system_uptime: {
    total_health_checks: number;
    healthy_checks: number;
    unhealthy_checks: number;
    uptime_percent: number;
    goal_uptime_percent: number;
    status: string;
  };
  invoice_processing: {
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    cancelled_invoices: number;
    payment_rate_percent: number;
    avg_processing_time_minutes: number;
  };
  overall_health: {
    score: number;
    status: string;
    last_updated: string;
  };
}

export function SuccessMetricsDashboard() {
  const [metrics, setMetrics] = useState<SuccessMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h")

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [selectedTimeframe])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/metrics/success?timeframe=${selectedTimeframe}`)
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch success metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (reportType: 'week-to-date' | 'month-to-date' | 'custom') => {
    try {
      const response = await fetch(`/api/reports/success-metrics?reportType=${reportType}`, {
        method: 'POST'
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `success-metrics-report-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_target':
      case 'healthy':
      case 'good':
        return 'bg-green-500'
      case 'needs_improvement':
      case 'degraded':
      case 'slow':
        return 'bg-yellow-500'
      case 'unhealthy':
      case 'poor':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_target':
      case 'healthy':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'needs_improvement':
      case 'degraded':
      case 'slow':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'unhealthy':
      case 'poor':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading success metrics...</span>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load success metrics. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">HiBid Success Metrics</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of system performance and business metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport('week-to-date')}
            >
              <Download className="h-4 w-4 mr-2" />
              Week Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReport('month-to-date')}
            >
              <Download className="h-4 w-4 mr-2" />
              Month Report
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall System Health
          </CardTitle>
          <CardDescription>
            Combined score of all success metrics (Goal: 95+)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex items-center justify-center w-24 h-24 rounded-full border-8 border-gray-200">
                  <span className="text-2xl font-bold">{metrics.overall_health.score}</span>
                </div>
                <div
                  className={`absolute inset-0 rounded-full border-8 ${getStatusColor(metrics.overall_health.status)}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + (metrics.overall_health.score / 100) * 50}% 0%)`
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(metrics.overall_health.status)}
                  <span className="font-medium capitalize">{metrics.overall_health.status}</span>
                  <Badge variant={metrics.overall_health.score >= 95 ? 'default' : 'destructive'}>
                    {metrics.overall_health.score >= 95 ? 'On Target' : 'Needs Attention'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(metrics.overall_health.last_updated).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{metrics.overall_health.score}%</div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
          <TabsTrigger value="uptime">Uptime</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.checkout_performance.avg_response_time_ms}ms</div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(metrics.checkout_performance.status)}
                  <Badge variant={metrics.checkout_performance.avg_response_time_ms < 1000 ? 'default' : 'destructive'}>
                    {metrics.checkout_performance.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Goal: &lt;1000ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.checkout_performance.total_requests.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {metrics.checkout_performance.slow_requests} slow requests
                </div>
                <Progress value={metrics.checkout_performance.error_rate_percent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Error rate: {metrics.checkout_performance.error_rate_percent}%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Completion Rate</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.payment_completion.completion_rate_percent.toFixed(1)}%</div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(metrics.payment_completion.status)}
                  <Badge variant={metrics.payment_completion.completion_rate_percent >= 95 ? 'default' : 'destructive'}>
                    {metrics.payment_completion.status}
                  </Badge>
                </div>
                <Progress value={metrics.payment_completion.completion_rate_percent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Goal: {metrics.payment_completion.goal_completion_rate_percent}% |
                  {metrics.payment_completion.successful_payments}/{metrics.payment_completion.total_attempts} successful
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoice Processing</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.invoice_processing.payment_rate_percent.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {metrics.invoice_processing.paid_invoices} paid out of {metrics.invoice_processing.total_invoices}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg processing time: {metrics.invoice_processing.avg_processing_time_minutes.toFixed(1)} min
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calculations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calculation Accuracy</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.calculation_accuracy.accuracy_rate_percent.toFixed(1)}%</div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(metrics.calculation_accuracy.status)}
                  <Badge variant={metrics.calculation_accuracy.accuracy_rate_percent >= 100 ? 'default' : 'destructive'}>
                    {metrics.calculation_accuracy.status}
                  </Badge>
                </div>
                <Progress value={metrics.calculation_accuracy.accuracy_rate_percent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Goal: {metrics.calculation_accuracy.goal_accuracy_percent}% |
                  {metrics.calculation_accuracy.accurate_calculations}/{metrics.calculation_accuracy.total_calculations} accurate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Calculations</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.calculation_accuracy.error_calculations}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Errors in the selected timeframe
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total calculations: {metrics.calculation_accuracy.total_calculations}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="uptime" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.system_uptime.uptime_percent.toFixed(1)}%</div>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusIcon(metrics.system_uptime.status)}
                  <Badge variant={metrics.system_uptime.uptime_percent >= 99.9 ? 'default' : 'destructive'}>
                    {metrics.system_uptime.status}
                  </Badge>
                </div>
                <Progress value={metrics.system_uptime.uptime_percent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Goal: {metrics.system_uptime.goal_uptime_percent}% |
                  {metrics.system_uptime.healthy_checks}/{metrics.system_uptime.total_health_checks} healthy checks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Check Summary</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.system_uptime.healthy_checks}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Healthy checks out of {metrics.system_uptime.total_health_checks} total
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unhealthy checks: {metrics.system_uptime.unhealthy_checks}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(metrics.generated_at).toLocaleString()}
      </div>
    </div>
  )
}