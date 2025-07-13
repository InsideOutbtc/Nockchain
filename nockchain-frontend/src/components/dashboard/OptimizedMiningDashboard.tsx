'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Cpu, 
  MemoryStick, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Lightning,
  Gauge,
  Target,
  Settings,
  AlertTriangle,
  CheckCircle,
  Rocket,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EnhancedLineChart, MetricCard, PieChart } from '@/components/ui/Charts';
import { useWebSocket } from '@/hooks/useWebSocket';

// NOCKCHAIN Performance Constants
const OPTIMIZED_PROVING_TIME = 74; // seconds
const LEGACY_PROVING_TIME = 300; // seconds
const PERFORMANCE_BOOST = 5.0; // 5x faster
const MEMORY_REDUCTION = 32.0; // 32x less memory

interface OptimizedMiningStats {
  minerId: string;
  hashrate: number; // proofs per second
  memoryUsage: number; // GB
  provingTime: number; // seconds
  efficiencyMultiplier: number;
  optimizationEnabled: boolean;
  dailyEarnings: number;
  uptime: number;
  temperature: number;
  powerConsumption: number;
  lastSeen: Date;
}

interface NetworkMetrics {
  totalHashrate: number;
  optimizedMinersPercentage: number;
  averageProvingTime: number;
  difficultyAdjustment: number;
  networkStability: number;
  competitiveAdvantage: number;
}

interface PerformanceAlert {
  id: string;
  type: 'optimization' | 'performance' | 'network' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
}

export default function OptimizedMiningDashboard() {
  const [miners, setMiners] = useState<OptimizedMiningStats[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>({
    totalHashrate: 0,
    optimizedMinersPercentage: 0,
    averageProvingTime: LEGACY_PROVING_TIME,
    difficultyAdjustment: 0,
    networkStability: 100,
    competitiveAdvantage: 1,
  });
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [optimizationMode, setOptimizationMode] = useState(true);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket('ws://localhost:8080/mining-updates', {
    onMessage: (data) => {
      if (data.type === 'mining_stats') {
        setMiners(data.miners);
        setNetworkMetrics(data.network);
      } else if (data.type === 'performance_alert') {
        setAlerts(prev => [data.alert, ...prev.slice(0, 9)]);
      }
    }
  });

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate miner updates
      setMiners(prev => prev.map(miner => ({
        ...miner,
        hashrate: miner.hashrate + (Math.random() - 0.5) * 0.1,
        memoryUsage: miner.memoryUsage + (Math.random() - 0.5) * 0.2,
        temperature: 45 + Math.random() * 15,
        lastSeen: new Date(),
      })));

      // Update network metrics
      setNetworkMetrics(prev => ({
        ...prev,
        totalHashrate: prev.totalHashrate + (Math.random() - 0.5) * 2,
        optimizedMinersPercentage: Math.min(100, prev.optimizedMinersPercentage + Math.random() * 2),
        networkStability: 85 + Math.random() * 15,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Initialize with sample data
  useEffect(() => {
    const sampleMiners: OptimizedMiningStats[] = [
      {
        minerId: 'miner-001',
        hashrate: 0.81, // 60 threads / 74 seconds
        memoryUsage: 120, // 60 * 2GB
        provingTime: OPTIMIZED_PROVING_TIME,
        efficiencyMultiplier: PERFORMANCE_BOOST,
        optimizationEnabled: true,
        dailyEarnings: 45.50,
        uptime: 99.2,
        temperature: 52,
        powerConsumption: 350,
        lastSeen: new Date(),
      },
      {
        minerId: 'miner-002',
        hashrate: 0.33, // 20 threads / 60 seconds (partial optimization)
        memoryUsage: 40,
        provingTime: 60,
        efficiencyMultiplier: 2.5,
        optimizationEnabled: true,
        dailyEarnings: 18.75,
        uptime: 97.8,
        temperature: 48,
        powerConsumption: 200,
        lastSeen: new Date(),
      },
      {
        minerId: 'miner-003',
        hashrate: 0.13, // 40 threads / 300 seconds (legacy)
        memoryUsage: 2560, // 40 * 64GB
        provingTime: LEGACY_PROVING_TIME,
        efficiencyMultiplier: 1.0,
        optimizationEnabled: false,
        dailyEarnings: 8.20,
        uptime: 94.5,
        temperature: 65,
        powerConsumption: 800,
        lastSeen: new Date(),
      },
    ];

    setMiners(sampleMiners);
    
    // Add sample alerts
    setAlerts([
      {
        id: '1',
        type: 'optimization',
        severity: 'info',
        title: 'Optimization Available',
        message: 'Miner-003 can benefit from NOCKCHAIN optimizations for 5x performance boost',
        timestamp: new Date(),
        actionRequired: true,
      },
      {
        id: '2',
        type: 'network',
        severity: 'warning',
        title: 'Network Competition Increasing',
        message: 'Optimized miners now comprise 67% of network hashrate',
        timestamp: new Date(Date.now() - 300000),
        actionRequired: false,
      },
    ]);
  }, []);

  const totalHashrate = miners.reduce((sum, miner) => sum + miner.hashrate, 0);
  const averageEfficiency = miners.reduce((sum, miner) => sum + miner.efficiencyMultiplier, 0) / miners.length;
  const optimizedMiners = miners.filter(m => m.optimizationEnabled).length;
  const totalDailyEarnings = miners.reduce((sum, miner) => sum + miner.dailyEarnings, 0);

  // Generate performance comparison data
  const performanceData = [
    { name: 'Optimized', proofs: 0.81, memory: 120, earnings: 45.50, efficiency: 500 },
    { name: 'Partial', proofs: 0.33, memory: 40, earnings: 18.75, efficiency: 250 },
    { name: 'Legacy', proofs: 0.13, memory: 2560, earnings: 8.20, efficiency: 100 },
  ];

  const toggleOptimization = () => {
    setOptimizationMode(!optimizationMode);
    // In real implementation, this would send optimization toggle to miners
  };

  return (
    <div className="space-y-6">
      {/* Header with Optimization Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Optimized Mining Dashboard</h1>
            <p className="text-white/60">NOCKCHAIN Performance Boost: 5x Faster, 32x Less Memory</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={isConnected ? 'success' : 'error'}
            className="px-3 py-1"
          >
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </Badge>
          <Button
            onClick={toggleOptimization}
            className={`${optimizationMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <Lightning className="w-4 h-4 mr-2" />
            {optimizationMode ? 'OPTIMIZED' : 'LEGACY'}
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Hashrate"
          value={`${totalHashrate.toFixed(2)} P/s`}
          change={`${optimizedMiners}/${miners.length} optimized`}
          icon={<Zap className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Efficiency Avg"
          value={`${averageEfficiency.toFixed(1)}x`}
          change={`+${((averageEfficiency - 1) * 100).toFixed(0)}% boost`}
          icon={<Target className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Daily Earnings"
          value={`$${totalDailyEarnings.toFixed(2)}`}
          change={`${(optimizedMiners / miners.length * 100).toFixed(0)}% optimized`}
          icon={<Award className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Network Advantage"
          value={`${networkMetrics.competitiveAdvantage.toFixed(1)}x`}
          change={`${(100 - networkMetrics.optimizedMinersPercentage).toFixed(0)}% opportunity`}
          icon={<Gauge className="w-5 h-5" />}
          trend="up"
        />
      </div>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <Card className="glass-card border-orange-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Performance Alerts</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg glass-card border ${
                    alert.severity === 'critical' ? 'border-red-500/30' :
                    alert.severity === 'warning' ? 'border-orange-500/30' :
                    'border-blue-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-medium ${
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'warning' ? 'text-orange-400' :
                        'text-blue-400'
                      }`}>
                        {alert.title}
                      </h4>
                      <p className="text-white/70 text-sm mt-1">{alert.message}</p>
                    </div>
                    {alert.actionRequired && (
                      <Button size="sm" className="glass-button-primary">
                        Action
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mining Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Miner Stats */}
        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-green-400" />
              Active Miners ({miners.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {miners.map((miner) => (
                <motion.div
                  key={miner.minerId}
                  layout
                  className="p-4 glass-card border border-white/10 hover:border-blue-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        Date.now() - miner.lastSeen.getTime() < 30000 ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <span className="font-medium text-white">{miner.minerId}</span>
                      {miner.optimizationEnabled && (
                        <Badge variant="success" className="text-xs">
                          <Lightning className="w-3 h-3 mr-1" />
                          OPTIMIZED
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">${miner.dailyEarnings.toFixed(2)}/day</div>
                      <div className="text-white/60 text-sm">{miner.efficiencyMultiplier.toFixed(1)}x efficiency</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/60">Hashrate</div>
                      <div className="text-white font-medium">{miner.hashrate.toFixed(3)} P/s</div>
                    </div>
                    <div>
                      <div className="text-white/60">Memory</div>
                      <div className="text-white font-medium">{miner.memoryUsage}GB</div>
                    </div>
                    <div>
                      <div className="text-white/60">Proving</div>
                      <div className="text-white font-medium">{miner.provingTime}s</div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-xs text-white/60">
                    <span>Uptime: {miner.uptime.toFixed(1)}%</span>
                    <span>Temp: {miner.temperature.toFixed(0)}°C</span>
                    <span>Power: {miner.powerConsumption}W</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Comparison Chart */}
        <Card className="glass-card">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Performance Comparison
            </h3>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-4">
              <EnhancedLineChart
                data={performanceData.map(item => ({
                  name: item.name,
                  proofs: item.proofs * 100, // Scale for visibility
                  efficiency: item.efficiency,
                  earnings: item.earnings,
                }))}
                lines={[
                  { dataKey: 'proofs', color: '#10b981', name: 'Proofs/s (x100)' },
                  { dataKey: 'efficiency', color: '#8b5cf6', name: 'Efficiency %' },
                  { dataKey: 'earnings', color: '#f59e0b', name: 'Daily Earnings $' },
                ]}
                height={240}
                showGrid={true}
                animated={true}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">5x</div>
                <div className="text-white/60 text-sm">Faster Proving</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">32x</div>
                <div className="text-white/60 text-sm">Less Memory</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">500%</div>
                <div className="text-white/60 text-sm">Efficiency Gain</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Competition Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Network Competition Analysis
            </h3>
            <div className="flex gap-2">
              {['1h', '24h', '7d', '30d'].map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant={selectedTimeframe === period ? 'primary' : 'ghost'}
                  onClick={() => setSelectedTimeframe(period)}
                  className="text-xs"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Network Adoption</h4>
              <div className="text-3xl font-bold text-blue-400">
                {networkMetrics.optimizedMinersPercentage.toFixed(1)}%
              </div>
              <p className="text-white/60 text-sm">
                Miners using optimizations
              </p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${networkMetrics.optimizedMinersPercentage}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Competitive Window</h4>
              <div className="text-3xl font-bold text-green-400">
                {(100 - networkMetrics.optimizedMinersPercentage).toFixed(0)}%
              </div>
              <p className="text-white/60 text-sm">
                Opportunity remaining
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">
                  {networkMetrics.optimizedMinersPercentage < 50 ? 'High advantage' : 
                   networkMetrics.optimizedMinersPercentage < 80 ? 'Moderate advantage' : 'Limited advantage'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Network Stability</h4>
              <div className="text-3xl font-bold text-purple-400">
                {networkMetrics.networkStability.toFixed(0)}%
              </div>
              <p className="text-white/60 text-sm">
                Difficulty stability score
              </p>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400">
                  Optimizations improving stability
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 glass-card border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-400 font-medium">Strategic Recommendation</h4>
                <p className="text-white/80 text-sm mt-1">
                  {networkMetrics.optimizedMinersPercentage < 50 
                    ? "URGENT: Enable optimizations immediately for maximum competitive advantage. Network adoption is still low."
                    : networkMetrics.optimizedMinersPercentage < 80
                    ? "MODERATE: Optimizations still provide significant advantage. Window closing."
                    : "LIMITED: Most miners are optimized. Focus on efficiency tuning and hardware upgrades."
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}