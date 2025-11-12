'use client';

import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  avgValue: number;
  premiumRevenue: number;
  taxRevenue: number;
  netRevenue: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  title?: string;
  description?: string;
  height?: number;
  showGrowth?: boolean;
  growthRate?: number;
}

export function RevenueChart({ data, title = "Revenue Analytics", description, height = 400, showGrowth = true, growthRate }: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd');
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Value')
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions, 0);
  const avgTransactionValue = data.length > 0 ? totalRevenue / totalTransactions : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showGrowth && growthRate !== undefined && (
            <Badge variant={growthRate >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
              {growthRate >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(growthRate).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(avgTransactionValue)}</p>
            <p className="text-sm text-muted-foreground">Avg Transaction</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNetRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
                name="Gross Revenue"
              />
              <Area
                type="monotone"
                dataKey="netRevenue"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorNetRevenue)"
                strokeWidth={2}
                name="Net Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3">Revenue Breakdown</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items Total</span>
                <span className="font-medium">{formatCurrency(data.reduce((sum, item) => sum + (item.revenue - item.premiumRevenue - item.taxRevenue), 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Buyer's Premium</span>
                <span className="font-medium text-blue-600">{formatCurrency(data.reduce((sum, item) => sum + item.premiumRevenue, 0))}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span className="font-medium text-purple-600">{formatCurrency(data.reduce((sum, item) => sum + item.taxRevenue, 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Net Revenue</span>
                <span className="text-green-600">{formatCurrency(data.reduce((sum, item) => sum + item.netRevenue, 0))}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}