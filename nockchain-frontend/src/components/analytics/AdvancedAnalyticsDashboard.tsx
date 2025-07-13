'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Brain,
  Zap,
  Target,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Settings,
  Eye,
  Lightbulb,
  TrendingRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar, CircularProgress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';

interface MLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'optimization' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  timestamp: string;
  action?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  latency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
}

interface RevenueMetrics {
  total: number;
  growth: number;
  sources: Array<{
    name: string;
    value: number;
    percentage: number;
    change: number;
  }>;
  projections: Array<{
    month: string;
    projected: number;
    actual?: number;
  }>;
}

interface UserAnalytics {
  total: number;
  active: number;
  growth: number;
  retention: number;
  segments: Array<{
    name: string;
    count: number;
    percentage: number;
    value: number;
  }>;
  behavior: Array<{
    action: string;
    count: number;
    trend: number;
  }>;
}

export default function AdvancedAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const [mlInsights] = useState<MLInsight[]>([
    {
      id: 'insight_001',
      type: 'prediction',
      title: 'Revenue Spike Predicted',
      description: 'ML models predict 34% revenue increase in next 72 hours based on mining patterns',
      confidence: 87,
      impact: 'high',
      category: 'Revenue',
      timestamp: '2024-01-15T10:30:00Z',
      action: 'Scale infrastructure proactively'
    },
    {
      id: 'insight_002',
      type: 'optimization',
      title: 'Worker Efficiency Opportunity',
      description: 'GPU cluster #3 showing 15% underutilization - optimize workload distribution',
      confidence: 92,
      impact: 'medium',
      category: 'Performance',
      timestamp: '2024-01-15T10:25:00Z',
      action: 'Rebalance worker allocation'
    },
    {
      id: 'insight_003',
      type: 'anomaly',
      title: 'Unusual Network Traffic',
      description: 'Detected 23% spike in API calls from Asia-Pacific region',
      confidence: 78,
      impact: 'low',
      category: 'Security',
      timestamp: '2024-01-15T10:20:00Z',
      action: 'Monitor for potential threats'
    },
    {
      id: 'insight_004',
      type: 'recommendation',
      title: 'Cross-Chain Bridge Optimization',
      description: 'Reduce bridge fees by 12% to increase transaction volume by estimated 28%',
      confidence: 85,
      impact: 'high',
      category: 'Trading',
      timestamp: '2024-01-15T10:15:00Z',
      action: 'Implement dynamic fee adjustment'
    }
  ]);

  const [systemMetrics] = useState<SystemMetrics>({
    cpu: 73,
    memory: 68,
    storage: 45,
    network: 89,
    latency: 22,
    throughput: 15420,
    errorRate: 0.03,
    uptime: 99.97
  });

  const [revenueMetrics] = useState<RevenueMetrics>({
    total: 487392.45,
    growth: 23.7,
    sources: [
      { name: 'Mining Fees', value: 234567.89, percentage: 48.1, change: 12.3 },
      { name: 'Bridge Transactions', value: 145623.12, percentage: 29.9, change: 34.7 },
      { name: 'Trading Fees', value: 78942.34, percentage: 16.2, change: -5.2 },
      { name: 'Premium Features', value: 28259.10, percentage: 5.8, change: 67.8 }
    ],
    projections: [
      { month: 'Jan', projected: 520000, actual: 487392 },
      { month: 'Feb', projected: 580000 },
      { month: 'Mar', projected: 645000 },
      { month: 'Apr', projected: 720000 },
      { month: 'May', projected: 805000 },
      { month: 'Jun', projected: 900000 }
    ]
  });

  const [userAnalytics] = useState<UserAnalytics>({
    total: 15847,
    active: 12394,
    growth: 15.7,
    retention: 87.3,
    segments: [
      { name: 'Miners', count: 8420, percentage: 53.1, value: 324567.89 },
      { name: 'Traders', count: 4725, percentage: 29.8, value: 145623.12 },
      { name: 'Bridge Users', count: 2145, percentage: 13.5, value: 78942.34 },
      { name: 'Enterprise', count: 557, percentage: 3.6, value: 156789.23 }
    ],
    behavior: [
      { action: 'Mining Operations', count: 45672, trend: 12.3 },
      { action: 'Bridge Transactions', count: 8934, trend: 34.7 },
      { action: 'Trading Activity', count: 23456, trend: -5.2 },
      { action: 'Analytics Views', count: 12789, trend: 67.8 }
    ]
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const getInsightIcon = (type: MLInsight['type']) => {
    switch (type) {
      case 'prediction':
        return <TrendingUp className="w-4 h-4" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'optimization':
        return <Target className="w-4 h-4" />;
      case 'recommendation':
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: MLInsight['type']) => {
    switch (type) {
      case 'prediction':
        return 'text-[#ff8c42]';
      case 'anomaly':
        return 'text-[#ff8c42]';
      case 'optimization':
        return 'text-[#ff8c42]';
      case 'recommendation':
        return 'text-[#ff8c42]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">
              Advanced Analytics
            </h1>
            <Badge variant="success" className="px-3 py-1">
              <Brain className="w-4 h-4 mr-1" />
              AI Powered
            </Badge>
          </div>
          <p className="text-white/70 text-lg">
            Real-time insights powered by machine learning
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {(['1h', '24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`glass-button text-sm px-3 py-1 ${
                  timeRange === range ? 'glass-button-primary' : 'glass-button-secondary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="glass-button-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="glass-button">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* AI Insights Section */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#ff8c42]" />
              AI-Powered Insights
            </h3>
            <Badge variant="neutral" className="px-2 py-1">
              Live Analytics
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mlInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${getInsightColor(insight.type)}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <Badge
                      variant={
                        insight.impact === 'high' ? 'error' :
                        insight.impact === 'medium' ? 'warning' : 'neutral'
                      }
                      className="text-xs"
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {insight.confidence}%
                    </div>
                    <div className="text-xs text-white/60">confidence</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                  <p className="text-sm text-white/70">{insight.description}</p>
                </div>
                
                {insight.action && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs text-white/60">Recommended action:</span>
                    <button className="text-xs text-[#ff8c42] hover:text-[#ff8c42]/80">
                      {insight.action}
                    </button>
                  </div>
                )}
                
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full ${
                      insight.confidence > 80 ? 'bg-[#ff8c42]' :
                      insight.confidence > 60 ? 'bg-[#ff8c42]/70' : 'bg-[#ff8c42]/50'
                    }`}
                    style={{ width: `${insight.confidence}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge variant="success" className="px-2 py-1">
                +{revenueMetrics.growth}%
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${(revenueMetrics.total / 1000).toFixed(0)}K
              </h3>
              <p className="text-white/60 text-sm">Total Revenue</p>
              <ProgressBar 
                value={75} 
                className="h-2" 
                label="Monthly Target"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <Users className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge variant="success" className="px-2 py-1">
                +{userAnalytics.growth}%
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                {userAnalytics.total.toLocaleString()}
              </h3>
              <p className="text-white/60 text-sm">Total Users</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#ff8c42]">{userAnalytics.active.toLocaleString()}</span>
                <span className="text-white/60">active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <Activity className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge variant="success" className="px-2 py-1">
                {systemMetrics.uptime}%
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                {systemMetrics.latency}ms
              </h3>
              <p className="text-white/60 text-sm">Avg Latency</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#ff8c42]">{systemMetrics.throughput.toLocaleString()}</span>
                <span className="text-white/60">req/min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge variant="neutral" className="px-2 py-1">
                21 Agents
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                94.8%
              </h3>
              <p className="text-white/60 text-sm">AI Efficiency</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#ff8c42]">15.7%</span>
                <span className="text-white/60">optimization gain</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#ff8c42]" />
              Revenue Sources
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {revenueMetrics.sources.map((source, index) => (
              <motion.div
                key={source.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{source.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">
                      ${(source.value / 1000).toFixed(0)}K
                    </span>
                    <Badge
                      variant={source.change > 0 ? "success" : "error"}
                      className="text-xs"
                    >
                      {source.change > 0 ? '+' : ''}{source.change}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar
                    value={source.percentage}
                    className="flex-1 h-2"
                  />
                  <span className="text-white/60 text-sm min-w-[3rem]">
                    {source.percentage}%
                  </span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-[#ff8c42]" />
              Revenue Projections
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueMetrics.projections.map((projection, index) => (
                <motion.div
                  key={projection.month}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-white/70">{projection.month} 2024</span>
                  <div className="flex items-center gap-4">
                    {projection.actual && (
                      <span className="text-[#ff8c42] font-mono">
                        ${(projection.actual / 1000).toFixed(0)}K
                      </span>
                    )}
                    <span className="text-[#ff8c42] font-mono">
                      ${(projection.projected / 1000).toFixed(0)}K
                    </span>
                    {projection.actual && (
                      <Badge
                        variant={projection.actual >= projection.projected ? "success" : "warning"}
                        className="text-xs"
                      >
                        {((projection.actual / projection.projected - 1) * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-[#ff8c42]" />
            System Performance Monitoring
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ff8c42]" />
                <span className="text-white font-medium">CPU Usage</span>
              </div>
              <CircularProgress 
                value={systemMetrics.cpu} 
                className="w-16 h-16"
                label={`${systemMetrics.cpu}%`}
              />
              <div className="text-sm text-white/60">
                {systemMetrics.cpu > 80 ? 'High load' : 
                 systemMetrics.cpu > 60 ? 'Normal load' : 'Light load'}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#ff8c42]" />
                <span className="text-white font-medium">Memory</span>
              </div>
              <CircularProgress 
                value={systemMetrics.memory} 
                className="w-16 h-16"
                label={`${systemMetrics.memory}%`}
              />
              <div className="text-sm text-white/60">
                {16 - (16 * systemMetrics.memory / 100).toFixed(1)}GB available
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#ff8c42]" />
                <span className="text-white font-medium">Network</span>
              </div>
              <CircularProgress 
                value={systemMetrics.network} 
                className="w-16 h-16"
                label={`${systemMetrics.network}%`}
              />
              <div className="text-sm text-white/60">
                {systemMetrics.throughput.toLocaleString()} req/min
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#ff8c42]" />
                <span className="text-white font-medium">Storage</span>
              </div>
              <CircularProgress 
                value={systemMetrics.storage} 
                className="w-16 h-16"
                label={`${systemMetrics.storage}%`}
              />
              <div className="text-sm text-white/60">
                {((1000 * (100 - systemMetrics.storage)) / 100).toFixed(0)}GB free
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Error Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#ff8c42] font-mono">{systemMetrics.errorRate}%</span>
                  <CheckCircle className="w-4 h-4 text-[#ff8c42]" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Uptime</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#ff8c42] font-mono">{systemMetrics.uptime}%</span>
                  <CheckCircle className="w-4 h-4 text-[#ff8c42]" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Avg Latency</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#ff8c42] font-mono">{systemMetrics.latency}ms</span>
                  <Activity className="w-4 h-4 text-[#ff8c42]" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff8c42]" />
              User Segments
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {userAnalytics.segments.map((segment, index) => (
              <motion.div
                key={segment.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{segment.name}</span>
                  <Badge variant="neutral" className="text-xs">
                    {segment.percentage}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{segment.count.toLocaleString()} users</span>
                  <span className="text-[#ff8c42] font-mono">
                    ${(segment.value / 1000).toFixed(0)}K value
                  </span>
                </div>
                <ProgressBar
                  value={segment.percentage}
                  className="h-2"
                />
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#ff8c42]" />
              User Behavior
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {userAnalytics.behavior.map((behavior, index) => (
              <motion.div
                key={behavior.action}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0"
              >
                <div className="space-y-1">
                  <span className="text-white font-medium">{behavior.action}</span>
                  <div className="text-sm text-white/60">
                    {behavior.count.toLocaleString()} actions
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={behavior.trend > 0 ? "success" : "error"}
                    className="text-xs"
                  >
                    {behavior.trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(behavior.trend)}%
                  </Badge>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#ff8c42]" />
            System Health Overview
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-4 text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full bg-[#ff8c42]/20 text-[#ff8c42] flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">System Status</div>
                <div className="text-xs text-white/60">operational</div>
              </div>
              <div className="text-lg font-bold text-white">100%</div>
              <ProgressBar
                value={100}
                className="h-1"
              />
            </div>

            <div className="glass-card p-4 text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full bg-[#ff8c42]/20 text-[#ff8c42] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Data Processing</div>
                <div className="text-xs text-white/60">active</div>
              </div>
              <div className="text-lg font-bold text-white">98%</div>
              <ProgressBar
                value={98}
                className="h-1"
              />
            </div>

            <div className="glass-card p-4 text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full bg-[#ff8c42]/20 text-[#ff8c42] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Analytics Engine</div>
                <div className="text-xs text-white/60">optimized</div>
              </div>
              <div className="text-lg font-bold text-white">96%</div>
              <ProgressBar
                value={96}
                className="h-1"
              />
            </div>

            <div className="glass-card p-4 text-center space-y-3">
              <div className="w-8 h-8 mx-auto rounded-full bg-[#ff8c42]/20 text-[#ff8c42] flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Performance</div>
                <div className="text-xs text-white/60">excellent</div>
              </div>
              <div className="text-lg font-bold text-white">94%</div>
              <ProgressBar
                value={94}
                className="h-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}