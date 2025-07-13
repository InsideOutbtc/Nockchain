'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  BarChart3, 
  PieChart, 
  LineChart,
  Target,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Filter,
  Search,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';

interface TradingState {
  selectedPair: 'NOCK/USDT' | 'NOCK/BTC' | 'NOCK/ETH';
  orderType: 'market' | 'limit' | 'stop-loss' | 'take-profit';
  side: 'buy' | 'sell';
  amount: string;
  price: string;
  total: string;
  balance: {
    nock: number;
    usdt: number;
    btc: number;
    eth: number;
  };
  isProcessing: boolean;
  slippage: number;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  percentage: number;
}

interface Trade {
  id: string;
  timestamp: string;
  pair: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  fees: number;
}

interface MarketData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap: number;
}

export default function PremiumTradingInterface() {
  const [tradingState, setTradingState] = useState<TradingState>({
    selectedPair: 'NOCK/USDT',
    orderType: 'limit',
    side: 'buy',
    amount: '',
    price: '',
    total: '',
    balance: {
      nock: 1234.5678,
      usdt: 9876.54,
      btc: 0.5432,
      eth: 12.3456
    },
    isProcessing: false,
    slippage: 0.5
  });

  const [marketData, setMarketData] = useState<MarketData>({
    price: 0.087653,
    change24h: 12.47,
    volume24h: 2847392.45,
    high24h: 0.092341,
    low24h: 0.081247,
    marketCap: 15847293.82
  });

  const [orderBook, setOrderBook] = useState({
    bids: [
      { price: 0.087650, amount: 15420.50, total: 1351.37, percentage: 85 },
      { price: 0.087645, amount: 8934.25, total: 783.45, percentage: 65 },
      { price: 0.087640, amount: 12847.80, total: 1126.82, percentage: 70 },
      { price: 0.087635, amount: 6723.15, total: 589.23, percentage: 45 },
      { price: 0.087630, amount: 9245.67, total: 810.45, percentage: 58 }
    ] as OrderBookEntry[],
    asks: [
      { price: 0.087655, amount: 11247.30, total: 985.67, percentage: 62 },
      { price: 0.087660, amount: 7834.90, total: 687.12, percentage: 48 },
      { price: 0.087665, amount: 13567.20, total: 1189.45, percentage: 75 },
      { price: 0.087670, amount: 5623.45, total: 492.78, percentage: 35 },
      { price: 0.087675, amount: 8945.67, total: 784.23, percentage: 55 }
    ] as OrderBookEntry[]
  });

  const [recentTrades, setRecentTrades] = useState<Trade[]>([
    {
      id: 'tx_001',
      timestamp: '2024-01-15T10:30:45Z',
      pair: 'NOCK/USDT',
      side: 'buy',
      amount: 15420.50,
      price: 0.087650,
      total: 1351.37,
      status: 'completed',
      fees: 2.70
    },
    {
      id: 'tx_002',
      timestamp: '2024-01-15T10:29:23Z',
      pair: 'NOCK/USDT',
      side: 'sell',
      amount: 8934.25,
      price: 0.087645,
      total: 783.45,
      status: 'completed',
      fees: 1.57
    },
    {
      id: 'tx_003',
      timestamp: '2024-01-15T10:28:12Z',
      pair: 'NOCK/USDT',
      side: 'buy',
      amount: 12847.80,
      price: 0.087640,
      total: 1126.82,
      status: 'pending',
      fees: 2.25
    }
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate total when amount or price changes
  useEffect(() => {
    if (tradingState.amount && tradingState.price) {
      const amount = parseFloat(tradingState.amount);
      const price = parseFloat(tradingState.price);
      if (!isNaN(amount) && !isNaN(price)) {
        const total = (amount * price).toFixed(6);
        setTradingState(prev => ({ ...prev, total }));
      }
    }
  }, [tradingState.amount, tradingState.price]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update market data with simulated real-time changes
    setMarketData(prev => ({
      ...prev,
      price: prev.price * (1 + (Math.random() - 0.5) * 0.02),
      change24h: prev.change24h + (Math.random() - 0.5) * 2
    }));
    
    setRefreshing(false);
  }, []);

  const handleTrade = async () => {
    if (!tradingState.amount || !tradingState.price) return;
    
    setTradingState(prev => ({ ...prev, isProcessing: true }));
    
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newTrade: Trade = {
      id: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      pair: tradingState.selectedPair,
      side: tradingState.side,
      amount: parseFloat(tradingState.amount),
      price: parseFloat(tradingState.price),
      total: parseFloat(tradingState.total),
      status: 'completed',
      fees: parseFloat(tradingState.total) * 0.002
    };
    
    setRecentTrades(prev => [newTrade, ...prev.slice(0, 9)]);
    setTradingState(prev => ({ 
      ...prev, 
      isProcessing: false,
      amount: '',
      price: '',
      total: ''
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header with Market Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">
              Professional Trading
            </h1>
            <Badge variant="success" className="px-3 py-1">
              <Activity className="w-4 h-4 mr-1" />
              Live
            </Badge>
          </div>
          <p className="text-white/70 text-lg">
            Advanced trading with institutional-grade execution
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="glass-button-secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="glass-button"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
        </div>
      </div>

      {/* Market Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge 
                variant={marketData.change24h > 0 ? "success" : "error"}
                className="px-2 py-1"
              >
                {marketData.change24h > 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${marketData.price.toFixed(6)}
              </h3>
              <p className="text-white/60 text-sm">NOCK Price</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <div className="flex items-center text-[#ff8c42]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${(marketData.volume24h / 1000).toFixed(0)}K
              </h3>
              <p className="text-white/60 text-sm">24h Volume</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <span className="text-[#ff8c42] text-sm">24h High</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${marketData.high24h.toFixed(6)}
              </h3>
              <p className="text-white/60 text-sm">Peak Price</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6 text-red-400" />
              </div>
              <span className="text-red-400 text-sm">24h Low</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${marketData.low24h.toFixed(6)}
              </h3>
              <p className="text-white/60 text-sm">Bottom Price</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl glass-card glass-glow flex items-center justify-center">
                <PieChart className="w-6 h-6 text-[#ff8c42]" />
              </div>
              <Badge variant="neutral" className="px-2 py-1">
                Market Cap
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold text-white">
                ${(marketData.marketCap / 1000000).toFixed(1)}M
              </h3>
              <p className="text-white/60 text-sm">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Book */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#ff8c42]" />
                Order Book
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-xs">
                  {tradingState.selectedPair}
                </Badge>
                <Button size="sm" className="glass-button-secondary text-xs">
                  <Filter className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {/* Asks (Sell Orders) */}
              <div className="space-y-1">
                {orderBook.asks.reverse().map((ask, index) => (
                  <motion.div
                    key={index}
                    className="relative flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer group"
                    whileHover={{ x: 2 }}
                  >
                    <div 
                      className="absolute inset-0 bg-red-500/10"
                      style={{ width: `${ask.percentage}%` }}
                    />
                    <div className="relative z-10 flex justify-between w-full text-sm">
                      <span className="text-red-400 font-mono">
                        ${ask.price.toFixed(6)}
                      </span>
                      <span className="text-white/70 font-mono">
                        {ask.amount.toLocaleString()}
                      </span>
                      <span className="text-white/50 font-mono">
                        ${ask.total.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Spread */}
              <div className="px-4 py-3 bg-white/5 rounded-lg mx-4 my-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Spread</span>
                  <span className="text-white font-mono">
                    ${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(6)}
                  </span>
                  <span className="text-green-400 text-xs">
                    {(((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price) * 100).toFixed(3)}%
                  </span>
                </div>
              </div>
              
              {/* Bids (Buy Orders) */}
              <div className="space-y-1">
                {orderBook.bids.map((bid, index) => (
                  <motion.div
                    key={index}
                    className="relative flex items-center justify-between px-4 py-2 hover:bg-white/5 cursor-pointer group"
                    whileHover={{ x: 2 }}
                  >
                    <div 
                      className="absolute inset-0 bg-green-500/10"
                      style={{ width: `${bid.percentage}%` }}
                    />
                    <div className="relative z-10 flex justify-between w-full text-sm">
                      <span className="text-green-400 font-mono">
                        ${bid.price.toFixed(6)}
                      </span>
                      <span className="text-white/70 font-mono">
                        {bid.amount.toLocaleString()}
                      </span>
                      <span className="text-white/50 font-mono">
                        ${bid.total.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trading Form */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-[#ff8c42]" />
                Place Order
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="glass-button-secondary text-xs"
                >
                  {showAdvanced ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trading Pair Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Trading Pair</label>
              <div className="grid grid-cols-3 gap-2">
                {(['NOCK/USDT', 'NOCK/BTC', 'NOCK/ETH'] as const).map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setTradingState(prev => ({ ...prev, selectedPair: pair }))}
                    className={`glass-button py-2 px-3 text-sm ${
                      tradingState.selectedPair === pair 
                        ? 'glass-button-primary' 
                        : 'glass-button-secondary'
                    }`}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Order Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['market', 'limit'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTradingState(prev => ({ ...prev, orderType: type }))}
                    className={`glass-button py-2 px-3 text-sm ${
                      tradingState.orderType === type 
                        ? 'glass-button-primary' 
                        : 'glass-button-secondary'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy/Sell Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Side</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradingState(prev => ({ ...prev, side: 'buy' }))}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    tradingState.side === 'buy' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'glass-button-secondary'
                  }`}
                >
                  Buy NOCK
                </button>
                <button
                  onClick={() => setTradingState(prev => ({ ...prev, side: 'sell' }))}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    tradingState.side === 'sell' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'glass-button-secondary'
                  }`}
                >
                  Sell NOCK
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Amount (NOCK)</label>
              <div className="glass-input-container">
                <input
                  type="number"
                  value={tradingState.amount}
                  onChange={(e) => setTradingState(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00000000"
                  className="glass-input w-full"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button className="text-[#ff8c42] text-xs hover:text-[#ff8c42]/80">
                    25%
                  </button>
                  <button className="text-[#ff8c42] text-xs hover:text-[#ff8c42]/80">
                    50%
                  </button>
                  <button className="text-[#ff8c42] text-xs hover:text-[#ff8c42]/80">
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Price Input (only for limit orders) */}
            {tradingState.orderType === 'limit' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Price (USDT)</label>
                <div className="glass-input-container">
                  <input
                    type="number"
                    value={tradingState.price}
                    onChange={(e) => setTradingState(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.000000"
                    className="glass-input w-full"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ff8c42] text-xs hover:text-[#ff8c42]/80">
                    Market
                  </button>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Total (USDT)</label>
              <div className="glass-input-container">
                <input
                  type="number"
                  value={tradingState.total}
                  onChange={(e) => setTradingState(prev => ({ ...prev, total: e.target.value }))}
                  placeholder="0.000000"
                  className="glass-input w-full"
                  readOnly
                />
              </div>
            </div>

            {/* Advanced Options */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/80">Slippage Tolerance</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={tradingState.slippage}
                        onChange={(e) => setTradingState(prev => ({ ...prev, slippage: parseFloat(e.target.value) }))}
                        className="flex-1"
                      />
                      <span className="text-white/70 text-sm min-w-[3rem]">
                        {tradingState.slippage}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Balance Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Available Balance</label>
              <div className="glass-card p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">NOCK</span>
                  <span className="text-white font-mono">{tradingState.balance.nock.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">USDT</span>
                  <span className="text-white font-mono">{tradingState.balance.usdt.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Trade Button */}
            <Button
              onClick={handleTrade}
              disabled={!tradingState.amount || !tradingState.price || tradingState.isProcessing}
              className={`w-full py-3 ${
                tradingState.side === 'buy' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              {tradingState.isProcessing ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Order...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {tradingState.side === 'buy' ? 'Buy' : 'Sell'} NOCK
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ff8c42]" />
                Recent Trades
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="text-xs">
                  Live
                </Badge>
                <Button size="sm" className="glass-button-secondary text-xs">
                  <Bell className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {recentTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      trade.side === 'buy' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.side.toUpperCase()}
                        </span>
                        <Badge
                          variant={
                            trade.status === 'completed' ? 'success' :
                            trade.status === 'pending' ? 'warning' : 'error'
                          }
                          className="text-xs"
                        >
                          {trade.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {trade.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {trade.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                          {trade.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-white/60">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-mono text-white">
                      {trade.amount.toLocaleString()} NOCK
                    </div>
                    <div className="text-xs text-white/60 font-mono">
                      @ ${trade.price.toFixed(6)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security & Risk Management */}
      <Card className="glass-card">
        <CardHeader>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#ff8c42]" />
            Security & Risk Management
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#ff8c42]" />
                <span className="text-white font-medium">2FA Authentication</span>
              </div>
              <p className="text-white/60 text-sm">
                Two-factor authentication enabled for all trades
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#ff8c42]" />
                <span className="text-white font-medium">Cold Storage</span>
              </div>
              <p className="text-white/60 text-sm">
                95% of funds secured in offline cold storage
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Risk Monitoring</span>
              </div>
              <p className="text-white/60 text-sm">
                Real-time risk assessment and position monitoring
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}