"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Coins, 
  Users, 
  Activity,
  Eye,
  Settings,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HardDrive,
  Thermometer,
  Signal,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Maximize2,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';

interface MiningStats {
  currentHashrate: number;
  averageHashrate: number;
  efficiency: number;
  totalShares: number;
  validShares: number;
  invalidShares: number;
  pendingBalance: number;
  paidBalance: number;
  workersOnline: number;
  poolHashrate: number;
  networkHashrate: number;
  difficulty: number;
  blockHeight: number;
  lastBlockFound: string;
  estimatedEarnings24h: number;
  nockOptimization: {
    enabled: boolean;
    efficiency: number;
    zkAcceleration: number;
    mobileHashrate: number;
    eonStatus: string;
    autonomousAgents: number;
    marketCapture: number;
  };
  workers: Array<{
    id: string;
    name: string;
    hashrate: number;
    temperature: number;
    status: 'online' | 'offline' | 'warning' | 'maintenance';
    lastSeen: string;
    location?: string;
    power: number;
    shares24h: number;
  }>;
  recentBlocks: Array<{
    height: number;
    hash: string;
    reward: number;
    timestamp: string;
    difficulty: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info' | 'success';
    message: string;
    timestamp: string;
    action?: string;
  }>;
}

export default function AdvancedMiningDashboard() {
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAlerts, setShowAlerts] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Enhanced mock data with realistic mining operations
  useEffect(() => {
    const mockData: MiningStats = {
      currentHashrate: 156.7,
      averageHashrate: 142.3,
      efficiency: 98.5,
      totalShares: 15847,
      validShares: 15823,
      invalidShares: 24,
      pendingBalance: 0.0847,
      paidBalance: 2.347,
      workersOnline: 8,
      poolHashrate: 2856.4,
      networkHashrate: 45200.8,
      difficulty: 1.24e12,
      blockHeight: 11730,
      lastBlockFound: '2 hours ago',
      estimatedEarnings24h: 0.0234,
      nockOptimization: {
        enabled: true,
        efficiency: 15.7,
        zkAcceleration: 8.5,
        mobileHashrate: 150,
        eonStatus: 'Optimized',
        autonomousAgents: 100,
        marketCapture: 34.7
      },
      workers: [
        { 
          id: '1', name: 'NOCK-Rig-01', hashrate: 45.2, temperature: 67, 
          status: 'online', lastSeen: 'now', location: 'US-East', power: 2400, shares24h: 1247 
        },
        { 
          id: '2', name: 'NOCK-Rig-02', hashrate: 43.8, temperature: 72, 
          status: 'online', lastSeen: 'now', location: 'US-West', power: 2350, shares24h: 1189 
        },
        { 
          id: '3', name: 'NOCK-Rig-03', hashrate: 41.1, temperature: 79, 
          status: 'warning', lastSeen: '1m ago', location: 'EU-Central', power: 2280, shares24h: 1098 
        },
        { 
          id: '4', name: 'Mobile-NOCK-01', hashrate: 0.15, temperature: 42, 
          status: 'online', lastSeen: 'now', location: 'Mobile', power: 25, shares24h: 89 
        },
        { 
          id: '5', name: 'NOCK-Rig-04', hashrate: 44.7, temperature: 70, 
          status: 'online', lastSeen: 'now', location: 'Asia-Pacific', power: 2380, shares24h: 1203 
        },
        { 
          id: '6', name: 'NOCK-Rig-05', hashrate: 0, temperature: 0, 
          status: 'maintenance', lastSeen: '5m ago', location: 'US-Central', power: 0, shares24h: 956 
        },
        { 
          id: '7', name: 'NOCK-Rig-06', hashrate: 46.3, temperature: 68, 
          status: 'online', lastSeen: 'now', location: 'Canada', power: 2420, shares24h: 1267 
        },
        { 
          id: '8', name: 'Mobile-NOCK-02', hashrate: 0.12, temperature: 39, 
          status: 'online', lastSeen: 'now', location: 'Mobile', power: 18, shares24h: 67 
        },
      ],
      recentBlocks: [
        { height: 11730, hash: '0x7f9a8b...', reward: 6.25, timestamp: '2 hours ago', difficulty: 1.24e12 },
        { height: 11729, hash: '0x5e8c7d...', reward: 6.25, timestamp: '4 hours ago', difficulty: 1.22e12 },
        { height: 11728, hash: '0x9d6f2a...', reward: 6.25, timestamp: '6 hours ago', difficulty: 1.23e12 },
        { height: 11727, hash: '0x3c5b8e...', reward: 6.25, timestamp: '8 hours ago', difficulty: 1.21e12 },
      ],
      alerts: [
        { 
          id: '1', 
          type: 'warning', 
          message: 'NOCK-Rig-03 temperature high (79°C)', 
          timestamp: '2m ago',
          action: 'Check cooling'
        },
        { 
          id: '2', 
          type: 'info', 
          message: 'NOCK optimization efficiency increased to 15.7%', 
          timestamp: '15m ago' 
        },
        { 
          id: '3', 
          type: 'success', 
          message: 'New block found! Reward: 6.25 NOCK', 
          timestamp: '2h ago' 
        },
      ]
    };

    setStats(mockData);
    setIsConnected(true);

    // Start auto-refresh if enabled
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        setStats(prev => prev ? {
          ...prev,
          currentHashrate: Math.max(100, prev.currentHashrate + (Math.random() - 0.5) * 8),
          workers: prev.workers.map(worker => ({
            ...worker,
            hashrate: worker.status === 'online' ? 
              Math.max(0, worker.hashrate + (Math.random() - 0.5) * 3) : 
              worker.status === 'maintenance' ? 0 : worker.hashrate,
            temperature: worker.status === 'online' ? 
              Math.max(30, Math.min(85, worker.temperature + (Math.random() - 0.5) * 2)) : 
              worker.temperature,
            shares24h: worker.status === 'online' ? 
              worker.shares24h + Math.floor(Math.random() * 3) :
              worker.shares24h
          })),
          pendingBalance: prev.pendingBalance + Math.random() * 0.0002,
          blockHeight: prev.blockHeight + (Math.random() > 0.95 ? 1 : 0)
        } : null);
      }, 3000);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [autoRefresh]);

  const formatHashrate = (hashrate: number) => {
    if (hashrate >= 1000) return `${(hashrate / 1000).toFixed(2)}GH/s`;
    if (hashrate >= 1) return `${hashrate.toFixed(2)}MH/s`;
    return `${(hashrate * 1000).toFixed(0)}KH/s`;
  };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(4)} NOCK`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      case 'maintenance': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'offline': return <XCircle className="w-4 h-4" />;
      case 'maintenance': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleWorkerAction = (workerId: string, action: string) => {
    console.log(`Action ${action} for worker ${workerId}`);
    // Implement worker actions (restart, stop, configure, etc.)
  };

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-nock-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Advanced Mining Dashboard
          </h1>
          <p className="text-white/70">
            Real-time NOCK mining operations with autonomous optimization
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Connection Status */}
          <motion.div 
            className={`flex items-center gap-2 px-4 py-2 rounded-full glass-badge ${
              isConnected ? 'glass-badge-success' : 'glass-badge-error'
            }`}
            animate={{ scale: isConnected ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm font-medium">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </motion.div>
          
          {/* Auto Refresh Toggle */}
          <Button
            variant={autoRefresh ? "primary" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
            icon={autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>

          {/* View Controls */}
          <div className="flex glass-card rounded-lg border border-white/10">
            {(['1h', '24h', '7d', '30d'] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "primary" : "ghost"}
                size="sm"
                onClick={() => setTimeframe(period)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {period}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
              Export
            </Button>
            <Button variant="outline" size="sm" icon={<Settings className="w-4 h-4" />}>
              Settings
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Alerts Section */}
      <AnimatePresence>
        {showAlerts && stats.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {stats.alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Alert
                  variant={alert.type as any}
                  dismissible
                  onDismiss={() => {
                    setStats(prev => prev ? {
                      ...prev,
                      alerts: prev.alerts.filter(a => a.id !== alert.id)
                    } : null);
                  }}
                  icon={getAlertIcon(alert.type)}
                  actions={alert.action && (
                    <Button variant="outline" size="sm">
                      {alert.action}
                    </Button>
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span>{alert.message}</span>
                    <span className="text-xs opacity-70 ml-4">{alert.timestamp}</span>
                  </div>
                </Alert>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover className="glass-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    +{((stats.currentHashrate / stats.averageHashrate - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1 text-white">
                  {formatHashrate(stats.currentHashrate)}
                </p>
                <p className="text-white/60 text-sm">Current Hashrate</p>
                <div className="mt-3">
                  <Progress 
                    value={(stats.currentHashrate / stats.averageHashrate) * 100} 
                    variant="success"
                    size="sm"
                    animated
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover className="glass-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Coins className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60">≈ ${(stats.pendingBalance * 0.15).toFixed(2)} USD</p>
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1 text-white">
                  {formatCurrency(stats.pendingBalance)}
                </p>
                <p className="text-white/60 text-sm">Pending Balance</p>
                <div className="mt-3">
                  <Badge variant="info" size="sm">
                    +{formatCurrency(stats.estimatedEarnings24h)} / 24h
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card hover className="glass-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-sm font-medium text-green-400">
                  {stats.efficiency.toFixed(1)}%
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1 text-white">
                  {((stats.validShares / stats.totalShares) * 100).toFixed(2)}%
                </p>
                <p className="text-white/60 text-sm">Share Efficiency</p>
                <div className="mt-3 text-xs text-white/60">
                  {stats.validShares.toLocaleString()} valid / {stats.totalShares.toLocaleString()} total
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card hover className="glass-glow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-green-400 text-sm font-medium">
                  {stats.workers.filter(w => w.status === 'online').length}/{stats.workers.length}
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1 text-white">{stats.workersOnline}</p>
                <p className="text-white/60 text-sm">Workers Online</p>
                <div className="mt-3">
                  <div className="flex gap-1">
                    {stats.workers.map((worker, index) => (
                      <div
                        key={worker.id}
                        className={`h-2 flex-1 rounded-full ${
                          worker.status === 'online' ? 'bg-green-400' :
                          worker.status === 'warning' ? 'bg-yellow-400' :
                          worker.status === 'maintenance' ? 'bg-blue-400' : 'bg-red-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* NOCK Optimization Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass-card-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-500/20 rounded-xl">
                  <Zap className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">NOCK Optimization Engine</CardTitle>
                  <p className="text-white/70 mt-1">Revolutionary blockchain optimization system</p>
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge variant="success" size="lg">
                  +{stats.nockOptimization.efficiency}% Efficiency
                </Badge>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 glass-card bg-blue-500/10 border-blue-500/20">
                <div className="text-3xl font-bold text-blue-400 mb-2">Eon-Aware</div>
                <div className="text-sm text-white/70">Mining Optimization</div>
                <div className="mt-3">
                  <Progress value={95} variant="info" size="sm" animated />
                </div>
              </div>
              <div className="text-center p-4 glass-card bg-green-500/10 border-green-500/20">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {stats.nockOptimization.zkAcceleration}x Faster
                </div>
                <div className="text-sm text-white/70">ZK Proof Generation</div>
                <div className="mt-3">
                  <Progress value={85} variant="success" size="sm" animated />
                </div>
              </div>
              <div className="text-center p-4 glass-card bg-purple-500/10 border-purple-500/20">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {stats.nockOptimization.mobileHashrate} KH/s
                </div>
                <div className="text-sm text-white/70">Mobile Mining</div>
                <div className="mt-3">
                  <Badge variant="info" size="sm">Revolutionary</Badge>
                </div>
              </div>
              <div className="text-center p-4 glass-card bg-orange-500/10 border-orange-500/20">
                <div className="text-3xl font-bold text-orange-400 mb-2">
                  {stats.nockOptimization.autonomousAgents}%
                </div>
                <div className="text-sm text-white/70">AI Enhanced</div>
                <div className="mt-3">
                  <Progress value={100} variant="warning" size="sm" animated />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Workers Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Mining Workers</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'primary' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button variant="outline" size="sm" icon={<Filter className="w-4 h-4" />}>
                  Filter
                </Button>
                <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              <AnimatePresence>
                {stats.workers.map((worker, index) => (
                  <motion.div
                    key={worker.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedWorker(worker.id)}
                    className={`glass-card glass-interactive cursor-pointer ${
                      selectedWorker === worker.id ? 'border-blue-500/50 bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            worker.status === 'online' ? 'bg-green-400' :
                            worker.status === 'warning' ? 'bg-yellow-400' :
                            worker.status === 'maintenance' ? 'bg-blue-400' : 'bg-red-400'
                          }`} />
                          <span className="font-medium text-white truncate">{worker.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {worker.name.includes('Mobile') ? (
                            <Signal className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Cpu className="w-4 h-4 text-blue-400" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-6 h-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open worker menu
                            }}
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Hashrate</span>
                          <span className="text-sm font-medium text-white">
                            {worker.status === 'online' || worker.status === 'warning' 
                              ? formatHashrate(worker.hashrate) 
                              : 'Offline'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/60">Temperature</span>
                          <div className={`flex items-center gap-1 text-sm font-medium ${
                            worker.temperature > 75 ? 'text-red-400' : 
                            worker.temperature > 65 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            <Thermometer className="w-3 h-3" />
                            {worker.status === 'offline' ? '--' : `${worker.temperature}°C`}
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Status</span>
                          <div className={`flex items-center gap-1 text-sm font-medium ${getStatusColor(worker.status)}`}>
                            {getStatusIcon(worker.status)}
                            <span className="capitalize">{worker.status}</span>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">24h Shares</span>
                          <span className="text-sm font-medium text-white">
                            {worker.shares24h.toLocaleString()}
                          </span>
                        </div>

                        {worker.location && (
                          <div className="flex justify-between">
                            <span className="text-sm text-white/60">Location</span>
                            <span className="text-sm text-white/80">{worker.location}</span>
                          </div>
                        )}

                        {/* Worker performance bar */}
                        <div className="pt-3 border-t border-white/10">
                          <div className="flex justify-between text-xs text-white/60 mb-2">
                            <span>Performance</span>
                            <span>
                              {worker.status === 'online' ? '100%' : 
                               worker.status === 'warning' ? '75%' :
                               worker.status === 'maintenance' ? '0%' : '0%'}
                            </span>
                          </div>
                          <Progress
                            value={
                              worker.status === 'online' ? 100 : 
                              worker.status === 'warning' ? 75 :
                              0
                            }
                            variant={
                              worker.status === 'online' ? 'success' :
                              worker.status === 'warning' ? 'warning' : 'error'
                            }
                            size="sm"
                            animated={worker.status === 'online'}
                          />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-2">
                          {worker.status === 'online' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWorkerAction(worker.id, 'restart');
                              }}
                            >
                              Restart
                            </Button>
                          )}
                          {worker.status === 'offline' && (
                            <Button 
                              variant="success" 
                              size="sm" 
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWorkerAction(worker.id, 'start');
                              }}
                            >
                              Start
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open worker details
                            }}
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pool Statistics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Pool Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Pool Hashrate</span>
                  <span className="font-bold text-blue-400">{formatHashrate(stats.poolHashrate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Network Hashrate</span>
                  <span className="font-bold text-white">{formatHashrate(stats.networkHashrate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Pool Share</span>
                  <span className="font-bold text-green-400">
                    {((stats.poolHashrate / stats.networkHashrate) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Block Height</span>
                  <span className="font-bold text-white">#{stats.blockHeight.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Last Block</span>
                  <span className="font-bold text-purple-400">{stats.lastBlockFound}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Difficulty</span>
                  <span className="font-bold text-white">{(stats.difficulty / 1e12).toFixed(2)}T</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Blocks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentBlocks.map((block, index) => (
                  <motion.div
                    key={block.height}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 glass-card rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      <div>
                        <div className="font-medium text-white">#{block.height}</div>
                        <div className="text-xs text-white/60">{block.timestamp}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">{block.reward} NOCK</div>
                      <div className="text-xs text-white/60">{block.hash}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}