'use client'

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts'
import { motion } from 'framer-motion'
import { formatHashrate, formatTime } from '@/lib/utils'

interface HashrateDataPoint {
  timestamp: number
  totalHashrate: number
  poolHashrate: number
  networkHashrate: number
  difficulty: number
  minerCount: number
}

interface HashrateChartProps {
  timeframe: '1h' | '24h' | '7d' | '30d'
  height?: number
  showNetwork?: boolean
  showDifficulty?: boolean
}

export function HashrateChart({ 
  timeframe, 
  height = 300, 
  showNetwork = true, 
  showDifficulty = false 
}: HashrateChartProps) {
  const { data: hashrateData, isLoading, error } = useQuery({
    queryKey: ['hashrate-history', timeframe],
    queryFn: async (): Promise<HashrateDataPoint[]> => {
      const response = await fetch(`/api/v1/pool/hashrate?timeframe=${timeframe}`)
      if (!response.ok) throw new Error('Failed to fetch hashrate data')
      const data = await response.json()
      
      // Transform data and add calculated fields
      return data.map((point: any) => ({
        ...point,
        timestamp: point.timestamp * 1000, // Convert to milliseconds
        poolShare: point.networkHashrate > 0 ? (point.totalHashrate / point.networkHashrate) * 100 : 0
      }))
    },
    refetchInterval: timeframe === '1h' ? 30000 : timeframe === '24h' ? 60000 : 300000,
  })

  const chartData = useMemo(() => {
    if (!hashrateData) return []
    
    // Sort by timestamp
    return hashrateData.sort((a, b) => a.timestamp - b.timestamp)
  }, [hashrateData])

  const stats = useMemo(() => {
    if (!chartData.length) return null

    const current = chartData[chartData.length - 1]
    const previous = chartData[Math.max(0, chartData.length - 2)]
    
    const change = previous ? ((current.totalHashrate - previous.totalHashrate) / previous.totalHashrate) * 100 : 0
    const peak = Math.max(...chartData.map(d => d.totalHashrate))
    const average = chartData.reduce((sum, d) => sum + d.totalHashrate, 0) / chartData.length

    return {
      current: current.totalHashrate,
      change,
      peak,
      average,
      poolShare: current.poolShare || 0
    }
  }, [chartData])

  if (isLoading) {
    return (
      <div className="space-y-4" style={{ height }}>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-6 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="w-full bg-muted rounded animate-pulse" style={{ height: height - 80 }} />
      </div>
    )
  }

  if (error || !chartData.length) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="text-muted-foreground mb-2">No hashrate data available</div>
          <div className="text-sm text-muted-foreground">
            {error ? 'Failed to load data' : 'Waiting for mining data...'}
          </div>
        </div>
      </div>
    )
  }

  const formatTooltip = (value: number, name: string) => {
    if (name === 'totalHashrate' || name === 'poolHashrate' || name === 'networkHashrate') {
      return [formatHashrate(value), name.replace(/([A-Z])/g, ' $1').toLowerCase()]
    }
    if (name === 'difficulty') {
      return [formatHashrate(value), 'Difficulty']
    }
    if (name === 'minerCount') {
      return [value.toLocaleString(), 'Active Miners']
    }
    return [value, name]
  }

  const formatXAxisTick = (timestamp: number) => {
    return formatTime(new Date(timestamp), timeframe)
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Statistics Summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Current</div>
            <div className="font-semibold">{formatHashrate(stats.current)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Change</div>
            <div className={`font-semibold ${
              stats.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Peak</div>
            <div className="font-semibold">{formatHashrate(stats.peak)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Average</div>
            <div className="font-semibold">{formatHashrate(stats.average)}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height: height - 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="hashrateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              {showNetwork && (
                <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3}
            />
            
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisTick}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            
            <YAxis
              tickFormatter={(value) => formatHashrate(value, true)}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              labelFormatter={(timestamp) => formatTime(new Date(timestamp as number))}
              formatter={formatTooltip}
            />

            {/* Network hashrate background */}
            {showNetwork && (
              <Area
                type="monotone"
                dataKey="networkHashrate"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1}
                fill="url(#networkGradient)"
                strokeDasharray="5 5"
                opacity={0.5}
              />
            )}

            {/* Pool hashrate main area */}
            <Area
              type="monotone"
              dataKey="totalHashrate"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#hashrateGradient)"
            />

            {/* Reference lines for key metrics */}
            {stats && (
              <>
                <ReferenceLine 
                  y={stats.average} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="2 2"
                  opacity={0.5}
                />
                <ReferenceLine 
                  y={stats.peak} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="2 2"
                  opacity={0.3}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Additional metrics */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary rounded-sm opacity-70" />
            <span>Pool Hashrate</span>
          </div>
          {showNetwork && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border border-muted-foreground rounded-sm opacity-50" />
              <span>Network Hashrate</span>
            </div>
          )}
        </div>
        
        {stats && (
          <div>
            Pool Share: {stats.poolShare.toFixed(3)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}