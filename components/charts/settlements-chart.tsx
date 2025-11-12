'use client';

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, Clock, AlertCircle, Users, TrendingUp } from 'lucide-react';

interface SettlementData {
  settlementId: string;
  status: string;
  netProceeds: number;
  commissionRate: number;
  itemCount: number;
  settledItems: number;
  consignor?: {
    name: string;
    company?: string;
  };
}

interface StatusBreakdown {
  status: string;
  count: number;
  totalHammer: number;
  totalCommission: number;
  totalNetProceeds: number;
}

interface ConsignorBreakdown {
  consignorId: string;
  name: string;
  company?: string;
  totalNetProceeds: number;
  settlementCount: number;
  settledCount: number;
  avgCommissionRate: number;
}

interface CommissionDistribution {
  bracket: string;
  count: number;
  totalNetProceeds: number;
}

interface SettlementsChartProps {
  settlements: SettlementData[];
  statusBreakdown: StatusBreakdown[];
  consignorBreakdown: ConsignorBreakdown[];
  commissionDistribution: CommissionDistribution[];
  settlementRate?: number;
  totalNetProceeds?: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_COLORS = {
  settled: '#10b981',
  pending: '#f59e0b',
  disputed: '#ef4444',
};

const STATUS_ICONS = {
  settled: CheckCircle,
  pending: Clock,
  disputed: AlertCircle,
};

export function SettlementsChart({
  settlements,
  statusBreakdown,
  consignorBreakdown,
  commissionDistribution,
  settlementRate,
  totalNetProceeds
}: SettlementsChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Proceeds') || entry.name.includes('Amount') || entry.name.includes('Hammer')
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settlement Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Settlement Status
          </CardTitle>
          {settlementRate !== undefined && (
            <div className="flex items-center gap-2">
              <CardDescription>Settlement Rate</CardDescription>
              <Badge
                variant={settlementRate >= 80 ? "default" : settlementRate >= 60 ? "secondary" : "destructive"}
                className="flex items-center gap-1"
              >
                {settlementRate >= 80 ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {settlementRate.toFixed(1)}%
              </Badge>
            </div>
          )}
          {totalNetProceeds !== undefined && (
            <div className="mt-2">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalNetProceeds)}</p>
              <p className="text-sm text-muted-foreground">Total Net Proceeds</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) => `${status}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, 'Settlements']}
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
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.totalNetProceeds)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Rate Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Commission Rates
          </CardTitle>
          <CardDescription>Distribution of commission rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="bracket"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3b82f6" name="Settlements" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Consignors */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Consignors by Net Proceeds
          </CardTitle>
          <CardDescription>Best performing consignors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={consignorBreakdown.slice(0, 10)}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(value) => `Consignor: ${value}`}
                />
                <Bar dataKey="totalNetProceeds" fill="#10b981" name="Net Proceeds" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{consignorBreakdown.length}</p>
                <p className="text-sm text-muted-foreground">Active Consignors</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(consignorBreakdown.reduce((sum, item) => sum + item.totalNetProceeds, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Net Proceeds</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {((consignorBreakdown.reduce((sum, item) => sum + item.settledCount, 0) /
                    consignorBreakdown.reduce((sum, item) => sum + item.settlementCount, 0)) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Average Settlement Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}