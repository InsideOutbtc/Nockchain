'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  Zap, 
  Cpu, 
  MemoryStick, 
  Clock, 
  TrendingUp,
  DollarSign,
  Gauge,
  Lightning,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EnhancedLineChart, MetricCard } from '@/components/ui/Charts';

// NOCKCHAIN Performance Constants (Latest Optimizations)
const OPTIMIZED_PROVING_TIME_SECONDS = 74; // 5x faster than legacy 300 seconds
const LEGACY_PROVING_TIME_SECONDS = 300;
const OPTIMIZED_MEMORY_PER_THREAD_GB = 2; // 32x less than legacy 64GB
const LEGACY_MEMORY_PER_THREAD_GB = 64;
const PERFORMANCE_IMPROVEMENT_FACTOR = 5.0;
const MEMORY_REDUCTION_FACTOR = 32.0;
const BLOCKS_PER_DAY = 144; // 10 minute block times
const BASE_BLOCK_REWARD = 6.25; // NOCK per block

interface MiningConfiguration {
  threads: number;
  optimizationEnabled: boolean;
  electricityCostKwh: number;
  powerConsumptionWatts: number;
  poolFeePercentage: number;
  nockPrice: number;
}

interface PerformanceMetrics {
  proofsPerSecond: number;
  memoryUsageGb: number;
  provingTimeSeconds: number;
  efficiencyMultiplier: number;
  dailyEarnings: number;
  dailyElectricityCost: number;
  dailyProfit: number;
  breakEvenDays: number | null;
  expectedBlockTimeDays: number;
}

export default function OptimizedMiningCalculator() {
  const [config, setConfig] = useState<MiningConfiguration>({
    threads: 60,
    optimizationEnabled: true,
    electricityCostKwh: 0.12,
    powerConsumptionWatts: 500,
    poolFeePercentage: 2.0,
    nockPrice: 25.0,
  });

  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Calculate optimized performance metrics
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    const provingTime = config.optimizationEnabled ? OPTIMIZED_PROVING_TIME_SECONDS : LEGACY_PROVING_TIME_SECONDS;
    const memoryPerThread = config.optimizationEnabled ? OPTIMIZED_MEMORY_PER_THREAD_GB : LEGACY_MEMORY_PER_THREAD_GB;
    const efficiencyMultiplier = config.optimizationEnabled ? PERFORMANCE_IMPROVEMENT_FACTOR : 1.0;
    
    const proofsPerSecond = config.threads / provingTime;
    const memoryUsageGb = config.threads * memoryPerThread;
    
    // Calculate earnings with network assumptions
    const networkHashrateProofsPerSecond = 100; // Conservative estimate
    const poolShare = proofsPerSecond / networkHashrateProofsPerSecond;
    const dailyRewards = BASE_BLOCK_REWARD * BLOCKS_PER_DAY * poolShare;
    const afterFees = dailyRewards * (1 - config.poolFeePercentage / 100);
    const dailyEarnings = afterFees * config.nockPrice * efficiencyMultiplier;
    
    // Calculate electricity costs with optimization benefits
    const optimizedPowerConsumption = config.optimizationEnabled ? 
      config.powerConsumptionWatts / PERFORMANCE_IMPROVEMENT_FACTOR : 
      config.powerConsumptionWatts;
    const dailyPowerKwh = (optimizedPowerConsumption * 24) / 1000;
    const dailyElectricityCost = dailyPowerKwh * config.electricityCostKwh;
    
    const dailyProfit = dailyEarnings - dailyElectricityCost;
    const breakEvenDays = dailyProfit > 0 ? 1000 / dailyProfit : null; // Assuming $1000 hardware cost
    
    // Calculate expected block time for solo mining
    const myHashrateShare = proofsPerSecond / networkHashrateProofsPerSecond;
    const expectedBlockTimeDays = 1 / (myHashrateShare * BLOCKS_PER_DAY);

    return {
      proofsPerSecond,
      memoryUsageGb,
      provingTimeSeconds: provingTime,
      efficiencyMultiplier,
      dailyEarnings,
      dailyElectricityCost,
      dailyProfit,
      breakEvenDays,
      expectedBlockTimeDays,
    };
  }, [config]);

  // Generate comparison data for charts
  useEffect(() => {
    const data = [];
    for (let threads = 10; threads <= 100; threads += 10) {
      const optimizedTime = OPTIMIZED_PROVING_TIME_SECONDS;
      const legacyTime = LEGACY_PROVING_TIME_SECONDS;
      
      data.push({
        threads,
        optimized: threads / optimizedTime,
        legacy: threads / legacyTime,
        improvement: (threads / optimizedTime) / (threads / legacyTime),
      });
    }
    setComparisonData(data);
  }, []);

  const updateConfig = (key: keyof MiningConfiguration, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header with Performance Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Optimized Mining Calculator</h2>
        </div>
        <Badge 
          variant={config.optimizationEnabled ? 'success' : 'warning'}
          className="px-4 py-2 text-sm font-semibold"
        >
          {config.optimizationEnabled ? '5x FASTER MODE' : 'LEGACY MODE'}
        </Badge>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Proofs/Second"
          value={performanceMetrics.proofsPerSecond.toFixed(2)}
          change={config.optimizationEnabled ? `+${((PERFORMANCE_IMPROVEMENT_FACTOR - 1) * 100).toFixed(0)}%` : ''}
          icon={<Zap className="w-5 h-5" />}
          trend="up"
        />
        <MetricCard
          title="Memory Usage"
          value={`${performanceMetrics.memoryUsageGb}GB`}
          change={config.optimizationEnabled ? `-${((MEMORY_REDUCTION_FACTOR - 1) / MEMORY_REDUCTION_FACTOR * 100).toFixed(0)}%` : ''}
          icon={<MemoryStick className="w-5 h-5" />}
          trend="down"
        />
        <MetricCard
          title="Proving Time"
          value={`${performanceMetrics.provingTimeSeconds}s`}
          change={config.optimizationEnabled ? `-${(((LEGACY_PROVING_TIME_SECONDS - OPTIMIZED_PROVING_TIME_SECONDS) / LEGACY_PROVING_TIME_SECONDS) * 100).toFixed(0)}%` : ''}
          icon={<Clock className="w-5 h-5" />}
          trend="down"
        />
        <MetricCard
          title="Daily Profit"
          value={`$${performanceMetrics.dailyProfit.toFixed(2)}`}
          change={performanceMetrics.breakEvenDays ? `${performanceMetrics.breakEvenDays.toFixed(0)} days ROI` : 'No ROI'}
          icon={<DollarSign className="w-5 h-5" />}
          trend="up"
        />
      </div>

      {/* Configuration Panel */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Mining Configuration
          </h3>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Optimization Toggle */}
          <div className="flex items-center justify-between p-4 glass-card border border-blue-500/20">
            <div>
              <h4 className="text-white font-medium">NOCKCHAIN Optimizations</h4>
              <p className="text-white/60 text-sm">Enable 5x faster proving with 32x less memory</p>
            </div>
            <Button
              onClick={() => updateConfig('optimizationEnabled', !config.optimizationEnabled)}
              className={`${config.optimizationEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} transition-colors`}
            >
              {config.optimizationEnabled ? (
                <>
                  <Lightning className="w-4 h-4 mr-2" />
                  ENABLED
                </>
              ) : (
                'ENABLE'
              )}
            </Button>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Mining Threads
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={config.threads}
                  onChange={(e) => updateConfig('threads', parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>10</span>
                  <span className="font-medium text-blue-400">{config.threads}</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Electricity Cost ($/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.electricityCostKwh}
                  onChange={(e) => updateConfig('electricityCostKwh', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Power Consumption (Watts)
                </label>
                <input
                  type="number"
                  value={config.powerConsumptionWatts}
                  onChange={(e) => updateConfig('powerConsumptionWatts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 glass-input text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Pool Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.poolFeePercentage}
                  onChange={(e) => updateConfig('poolFeePercentage', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 glass-input text-white"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  NOCK Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.nockPrice}
                  onChange={(e) => updateConfig('nockPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 glass-input text-white"
                />
              </div>

              <div className="p-4 glass-card border border-yellow-500/20">
                <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Solo Mining Estimate
                </h4>
                <p className="text-white/80 text-sm">
                  Expected block time: <span className="font-medium text-white">
                    {performanceMetrics.expectedBlockTimeDays.toFixed(1)} days
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison Chart */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Performance Comparison: Optimized vs Legacy
          </h3>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <EnhancedLineChart
              data={comparisonData}
              lines={[
                { dataKey: 'optimized', color: '#10b981', name: 'Optimized (74s/proof)' },
                { dataKey: 'legacy', color: '#ef4444', name: 'Legacy (300s/proof)' },
              ]}
              height={240}
              showGrid={true}
              animated={true}
            />
          </div>
          <div className="mt-4 flex justify-center">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">5x</div>
                <div className="text-white/60 text-sm">Faster Proving</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">32x</div>
                <div className="text-white/60 text-sm">Less Memory</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">
                  {performanceMetrics.efficiencyMultiplier.toFixed(1)}x
                </div>
                <div className="text-white/60 text-sm">Efficiency Gain</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-yellow-400" />
            Profitability Analysis
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Daily Revenue</h4>
              <div className="text-2xl font-bold text-green-400">
                ${performanceMetrics.dailyEarnings.toFixed(2)}
              </div>
              <div className="text-white/60 text-sm">
                From {performanceMetrics.proofsPerSecond.toFixed(3)} proofs/second
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Daily Costs</h4>
              <div className="text-2xl font-bold text-red-400">
                ${performanceMetrics.dailyElectricityCost.toFixed(2)}
              </div>
              <div className="text-white/60 text-sm">
                {config.optimizationEnabled ? 'Optimized' : 'Standard'} power consumption
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white/80 font-medium">Daily Profit</h4>
              <div className={`text-2xl font-bold ${performanceMetrics.dailyProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${performanceMetrics.dailyProfit.toFixed(2)}
              </div>
              <div className="text-white/60 text-sm">
                {performanceMetrics.breakEvenDays ? 
                  `${performanceMetrics.breakEvenDays.toFixed(0)} days to break even` : 
                  'Not profitable'
                }
              </div>
            </div>
          </div>

          {config.optimizationEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 glass-card border border-green-500/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Lightning className="w-5 h-5 text-green-400" />
                <h4 className="text-green-400 font-medium">Optimization Benefits</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Performance boost:</span>
                  <span className="text-green-400 font-medium ml-2">
                    +{((PERFORMANCE_IMPROVEMENT_FACTOR - 1) * 100).toFixed(0)}% faster
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Memory savings:</span>
                  <span className="text-green-400 font-medium ml-2">
                    -{((MEMORY_REDUCTION_FACTOR - 1) / MEMORY_REDUCTION_FACTOR * 100).toFixed(0)}% less RAM
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}