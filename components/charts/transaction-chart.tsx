'use client';

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, CreditCard, CheckCircle, Clock, XCircle, Activity } from 'lucide-react';

interface TransactionData {
  hour: number;
  count: number;
  totalAmount: number;
}

interface StatusData {
  status: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
}

interface PaymentMethodData {
  method: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
}

interface TransactionChartProps {
  hourlyData: TransactionData[];
  statusBreakdown: StatusData[];
  paymentMethodBreakdown: PaymentMethodData[];
  completionRate?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_ICONS = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

const STATUS_COLORS = {
  completed: '#10b981',
  pending: '#f59e0b',
  failed: '#ef4444',
};

export function TransactionChart({
  hourlyData,
  statusBreakdown,
  paymentMethodBreakdown,
  completionRate
}: TransactionChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Amount')
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalTransactions = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
  const completedTransactions = statusBreakdown.find(item => item.status === 'completed')?.count || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Transaction Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Transaction Status
          </CardTitle>
          {completionRate !== undefined && (
            <div className="flex items-center gap-2">
              <CardDescription>Completion Rate</CardDescription>
              <Badge
                variant={completionRate >= 80 ? "default" : completionRate >= 60 ? "secondary" : "destructive"}
                className="flex items-center gap-1"
              >
                {completionRate >= 80 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {completionRate.toFixed(1)}%
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown as any[]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.status}: ${entry.count} (${(entry.percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, 'Transactions']}
                  content={<CustomTooltip />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {statusBreakdown.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || '#94a3b8' }}
                  />
                  {getStatusIcon(item.status)}
                  <span className="capitalize text-sm">{item.status}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Transaction volume by payment method</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="method"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" name="Transactions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {paymentMethodBreakdown.map((item, index) => (
              <div key={item.method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="capitalize text-sm">{item.method.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{item.count}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hourly Transaction Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Hourly Transaction Distribution</CardTitle>
          <CardDescription>Transaction volume by hour of day (last 7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={formatHour}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(value) => `Hour: ${formatHour(value as number)}`}
                />
                <Bar
                  dataKey="count"
                  fill="#8b5cf6"
                  name="Transactions"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalAmount"
                  fill="#10b981"
                  name="Total Amount"
                  radius={[4, 4, 0, 0]}
                />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}