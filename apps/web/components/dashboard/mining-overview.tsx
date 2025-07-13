'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  ChartBarIcon, 
  CpuChipIcon, 
  CurrencyDollarIcon,
  BoltIcon,
  UsersIcon,
  CubeIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

import { Card } from '@/components/ui/card'
import { HashrateChart } from '@/components/charts/hashrate-chart'
import { EarningsChart } from '@/components/charts/earnings-chart'
import { MinersList } from '@/components/miners/miners-list'
import { RecentBlocks } from '@/components/blocks/recent-blocks'
import { PayoutHistory } from '@/components/payouts/payout-history'
import { useWebSocket } from '@/hooks/use-websocket'
import { formatHashrate, formatCurrency, formatNumber } from '@/lib/utils'

interface PoolStats {
  totalHashrate: number
  activeMiners: number
  blocksFound: number
  totalShares: number
  validShares: number
  staleShares: number
  invalidShares: number
  luck: number
  effort: number
  networkDifficulty: number
  poolDifficulty: number
  uptime: number
  lastBlockTime?: number
}

interface MinerData {
  minerId: string
  hashrate: number
  sharesValid: number
  sharesInvalid: number
  lastShareTime?: number
  status: 'online' | 'offline' | 'idle'
  earnings: number
}

export function MiningOverview() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [alertsCount, setAlertsCount] = useState(0)

  // WebSocket connection for real-time updates
  const { data: wsData, isConnected } = useWebSocket({
    channels: ['pool_stats', 'hashrate', 'miners', 'blocks', 'alerts']
  })

  // Fetch initial pool statistics
  const { data: poolStats, isLoading: poolStatsLoading } = useQuery({
    queryKey: ['pool-stats'],
    queryFn: async (): Promise<PoolStats> => {
      const response = await fetch('/api/v1/pool/stats')
      if (!response.ok) throw new Error('Failed to fetch pool stats')
      return response.json()
    },
    refetchInterval: 30000, // Fallback refresh every 30 seconds
  })

  // Fetch miner data
  const { data: minersData, isLoading: minersLoading } = useQuery({
    queryKey: ['miners', selectedTimeframe],
    queryFn: async (): Promise<MinerData[]> => {
      const response = await fetch(`/api/v1/miners?timeframe=${selectedTimeframe}`)
      if (!response.ok) throw new Error('Failed to fetch miners')
      return response.json()
    },
    refetchInterval: 15000,
  })

  // Update data from WebSocket
  useEffect(() => {
    if (wsData?.type === 'PoolStats') {
      // Update pool stats from WebSocket
    } else if (wsData?.type === 'Alert') {
      setAlertsCount(prev => prev + 1)
    }
  }, [wsData])

  const stats = poolStats || {
    totalHashrate: 0,
    activeMiners: 0,
    blocksFound: 0,
    totalShares: 0,
    validShares: 0,
    staleShares: 0,
    invalidShares: 0,
    luck: 1.0,
    effort: 1.0,
    networkDifficulty: 0,
    poolDifficulty: 0,
    uptime: 0,
  }

  const efficiency = stats.totalShares > 0 ? (stats.validShares / stats.totalShares) * 100 : 0
  const hashrateTrend = 12.5 // Mock trend calculation
  const earningsTrend = -2.3 // Mock trend calculation

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Mining Pool Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and analytics for Nockchain mining operations
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Alerts indicator */}
          {alertsCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alertsCount}
              </span>
            </motion.div>
          )}

          {/* Timeframe selector */}
          <div className="flex space-x-1 bg-secondary rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedTimeframe === timeframe
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Hashrate"
          value={formatHashrate(stats.totalHashrate)}
          change={hashrateTrend}
          icon={<CpuChipIcon className="w-6 h-6" />}
          trend="up"
          isLoading={poolStatsLoading}
        />
        
        <MetricCard
          title="Active Miners"
          value={formatNumber(stats.activeMiners)}
          change={5.2}
          icon={<UsersIcon className="w-6 h-6" />}
          trend="up"
          isLoading={poolStatsLoading}
        />
        
        <MetricCard
          title="Blocks Found"
          value={formatNumber(stats.blocksFound)}
          change={0}
          icon={<CubeIcon className="w-6 h-6" />}
          trend="neutral"
          isLoading={poolStatsLoading}
        />
        
        <MetricCard
          title="Pool Efficiency"
          value={`${efficiency.toFixed(2)}%`}
          change={earningsTrend}
          icon={<BoltIcon className="w-6 h-6" />}
          trend={efficiency > 95 ? "up" : efficiency > 90 ? "neutral" : "down"}
          isLoading={poolStatsLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SecondaryMetric
          label="Pool Luck"
          value={`${(stats.luck * 100).toFixed(1)}%`}
          status={stats.luck > 1 ? 'good' : stats.luck > 0.8 ? 'neutral' : 'poor'}
        />
        
        <SecondaryMetric
          label="Pool Effort"
          value={`${(stats.effort * 100).toFixed(1)}%`}
          status={stats.effort < 1 ? 'good' : stats.effort < 1.2 ? 'neutral' : 'poor'}
        />
        
        <SecondaryMetric
          label="Valid Shares"
          value={formatNumber(stats.validShares)}
          status="neutral"
        />
        
        <SecondaryMetric
          label="Stale Shares"
          value={formatNumber(stats.staleShares)}
          status={stats.staleShares / stats.totalShares < 0.02 ? 'good' : 'poor'}
        />
        
        <SecondaryMetric
          label="Network Diff"
          value={formatHashrate(stats.networkDifficulty)}
          status="neutral"
        />
        
        <SecondaryMetric
          label="Uptime"
          value={formatUptime(stats.uptime)}
          status={stats.uptime > 99 ? 'good' : stats.uptime > 95 ? 'neutral' : 'poor'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-content">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Hashrate History</h3>
            <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <HashrateChart timeframe={selectedTimeframe} />
        </Card>

        <Card className="card-content">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Earnings Overview</h3>
            <CurrencyDollarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <EarningsChart timeframe={selectedTimeframe} />
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-content">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Active Miners</h3>
              <span className="text-sm text-muted-foreground">
                {minersData?.length || 0} miners
              </span>
            </div>
            <MinersList 
              miners={minersData || []} 
              isLoading={minersLoading}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-content">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Blocks</h3>
              <CubeIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <RecentBlocks />
          </Card>

          <Card className="card-content">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Latest Payouts</h3>
              <CurrencyDollarIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <PayoutHistory limit={5} />
          </Card>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: number
  icon: React.ReactNode
  trend: 'up' | 'down' | 'neutral'
  isLoading?: boolean
}

function MetricCard({ title, value, change, icon, trend, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className="card-content">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-6 h-6 bg-muted rounded" />
            <div className="w-12 h-4 bg-muted rounded" />
          </div>
          <div className="w-20 h-8 bg-muted rounded mb-1" />
          <div className="w-16 h-4 bg-muted rounded" />
        </div>
      </Card>
    )
  }

  const trendIcon = trend === 'up' ? (
    <TrendingUpIcon className="w-4 h-4 text-green-500" />
  ) : trend === 'down' ? (
    <TrendingDownIcon className="w-4 h-4 text-red-500" />
  ) : null

  const changeColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="card-content">
        <div className="flex items-center justify-between mb-2">
          <div className="text-muted-foreground">
            {icon}
          </div>
          {change !== 0 && (
            <div className={`flex items-center space-x-1 ${changeColor}`}>
              {trendIcon}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="mb-1">
          <div className="text-2xl font-bold">{value}</div>
        </div>
        
        <div className="text-sm text-muted-foreground">{title}</div>
      </Card>
    </motion.div>
  )
}

interface SecondaryMetricProps {
  label: string
  value: string
  status: 'good' | 'neutral' | 'poor'
}

function SecondaryMetric({ label, value, status }: SecondaryMetricProps) {
  const statusColor = {
    good: 'text-green-500',
    neutral: 'text-muted-foreground',
    poor: 'text-red-500'
  }[status]

  return (
    <Card className="card-content">
      <div className="text-center">
        <div className={`text-lg font-semibold ${statusColor}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {label}
        </div>
      </div>
    </Card>
  )
}

function formatUptime(uptime: number): string {
  if (uptime >= 99.9) return '99.9%+'
  return `${uptime.toFixed(1)}%`
}