'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Cpu, 
  Activity, 
  Zap, 
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Database,
  Server,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EnhancedLineChart, MetricCard } from '@/components/ui/Charts';
import { useNotifications } from '@/components/ui/Notifications';

interface PerformanceMetrics {
  timestamp: number;
  
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Runtime Performance
  memoryUsage: number;
  jsHeapSize: number;
  domNodes: number;
  eventListeners: number;
  
  // Network Performance
  connectionType: string;
  downlink: number;
  rtt: number;
  
  // Custom Metrics
  renderTime: number;
  apiLatency: number;
  errorRate: number;
  
  // User Experience
  scrollDepth: number;
  timeOnPage: number;
  interactions: number;
}

interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  apiLatency: number;
  renderTime: number;
  memoryUsage: number;
}

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string; timestamp: number }>>([]);
  
  const metricsRef = useRef<PerformanceMetrics[]>([]);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  const { addNotification } = useNotifications();

  // Performance budget thresholds
  const budget: PerformanceBudget = {
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    apiLatency: 100, // 100ms
    renderTime: 16, // 16ms (60fps)
    memoryUsage: 50 * 1024 * 1024 // 50MB
  };

  // Collect Core Web Vitals
  const collectWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
    const ttfb = navigation?.responseStart - navigation?.requestStart || 0;

    return {
      fcp,
      ttfb,
      lcp: 0, // Will be updated by observer
      fid: 0, // Will be updated by observer
      cls: 0  // Will be updated by observer
    };
  }, []);

  // Collect runtime metrics
  const collectRuntimeMetrics = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;

    return {
      memoryUsage: memory?.usedJSHeapSize || 0,
      jsHeapSize: memory?.totalJSHeapSize || 0,
      domNodes: document.querySelectorAll('*').length,
      eventListeners: getEventListenerCount(),
      connectionType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  }, []);

  // Count event listeners (approximate)
  const getEventListenerCount = () => {
    if (typeof window === 'undefined') return 0;
    
    let count = 0;
    const elements = document.querySelectorAll('*');
    
    // This is an approximation - actual listener counting is complex
    elements.forEach(element => {
      const events = ['click', 'scroll', 'resize', 'load'];
      events.forEach(event => {
        if ((element as any)[`on${event}`]) count++;
      });
    });
    
    return count;
  };

  // Measure render time
  const measureRenderTime = useCallback(() => {
    const start = performance.now();
    
    requestAnimationFrame(() => {
      const renderTime = performance.now() - start;
      
      setCurrentMetrics(prev => prev ? {
        ...prev,
        renderTime,
        timestamp: Date.now()
      } : null);
    });
  }, []);

  // Initialize performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set up Performance Observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            setCurrentMetrics(prev => prev ? { ...prev, lcp: entry.startTime } : null);
          }
          
          if (entry.entryType === 'first-input') {
            setCurrentMetrics(prev => prev ? { ...prev, fid: entry.processingStart - entry.startTime } : null);
          }
          
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            setCurrentMetrics(prev => prev ? { ...prev, cls: prev.cls + (entry as any).value } : null);
          }
        });
      });

      // Observe different types of performance entries
      try {
        observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });
        observerRef.current.observe({ entryTypes: ['first-input'] });
        observerRef.current.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Some performance observers not supported:', error);
      }
    }

    // Collect initial metrics
    const webVitals = collectWebVitals();
    const runtime = collectRuntimeMetrics();
    
    if (webVitals && runtime) {
      const initialMetrics: PerformanceMetrics = {
        timestamp: Date.now(),
        ...webVitals,
        ...runtime,
        renderTime: 0,
        apiLatency: 0,
        errorRate: 0,
        scrollDepth: 0,
        timeOnPage: 0,
        interactions: 0
      };
      
      setCurrentMetrics(initialMetrics);
    }

    // Set up regular metrics collection
    intervalRef.current = setInterval(() => {
      const runtime = collectRuntimeMetrics();
      if (runtime) {
        setCurrentMetrics(prev => prev ? {
          ...prev,
          ...runtime,
          timeOnPage: Date.now() - startTimeRef.current,
          timestamp: Date.now()
        } : null);
      }
      
      measureRenderTime();
    }, 1000);

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = (scrollTop / docHeight) * 100;
      
      setCurrentMetrics(prev => prev ? {
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth, scrollDepth)
      } : null);
    };

    // Track interactions
    const handleInteraction = () => {
      setCurrentMetrics(prev => prev ? {
        ...prev,
        interactions: prev.interactions + 1
      } : null);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [collectWebVitals, collectRuntimeMetrics, measureRenderTime]);

  // Update metrics history
  useEffect(() => {
    if (currentMetrics) {
      setMetrics(prev => {
        const updated = [...prev, currentMetrics].slice(-60); // Keep last 60 data points
        metricsRef.current = updated;
        return updated;
      });
      
      // Check for performance budget violations
      checkPerformanceBudget(currentMetrics);
    }
  }, [currentMetrics]);

  // Check performance budget violations
  const checkPerformanceBudget = (metrics: PerformanceMetrics) => {
    const violations: Array<{ type: string; message: string }> = [];

    if (metrics.lcp > budget.lcp) {
      violations.push({
        type: 'warning',
        message: `LCP exceeded budget: ${metrics.lcp.toFixed(0)}ms > ${budget.lcp}ms`
      });
    }

    if (metrics.fid > budget.fid) {
      violations.push({
        type: 'warning',
        message: `FID exceeded budget: ${metrics.fid.toFixed(0)}ms > ${budget.fid}ms`
      });
    }

    if (metrics.cls > budget.cls) {
      violations.push({
        type: 'warning',
        message: `CLS exceeded budget: ${metrics.cls.toFixed(3)} > ${budget.cls}`
      });
    }

    if (metrics.memoryUsage > budget.memoryUsage) {
      violations.push({
        type: 'error',
        message: `Memory usage exceeded: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB > ${(budget.memoryUsage / 1024 / 1024).toFixed(1)}MB`
      });
    }

    violations.forEach(violation => {
      const alert = {
        ...violation,
        timestamp: Date.now()
      };
      
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
      
      if (violation.type === 'error') {
        addNotification({
          type: 'warning',
          title: 'Performance Budget Violation',
          message: violation.message,
          duration: 5000
        });
      }
    });
  };

  // Get performance score
  const getPerformanceScore = () => {
    if (!currentMetrics) return 0;

    let score = 100;
    
    // LCP scoring (0-40 points)
    if (currentMetrics.lcp > 4000) score -= 40;
    else if (currentMetrics.lcp > 2500) score -= 20;
    
    // FID scoring (0-25 points)
    if (currentMetrics.fid > 300) score -= 25;
    else if (currentMetrics.fid > 100) score -= 15;
    
    // CLS scoring (0-25 points)
    if (currentMetrics.cls > 0.25) score -= 25;
    else if (currentMetrics.cls > 0.1) score -= 15;
    
    // Memory usage (0-10 points)
    if (currentMetrics.memoryUsage > budget.memoryUsage * 2) score -= 10;
    else if (currentMetrics.memoryUsage > budget.memoryUsage) score -= 5;

    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          className="glass-button-secondary rounded-full p-3"
          title="Show Performance Monitor"
        >
          <Monitor className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50"
      >
        <Card className="glass-card border border-white/20 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Performance Monitor</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={getPerformanceScore() >= 90 ? 'success' : getPerformanceScore() >= 70 ? 'warning' : 'error'}
                  className="px-2 py-1"
                >
                  {getPerformanceScore().toFixed(0)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Core Web Vitals */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Core Web Vitals</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass-card p-3 text-center">
                  <div className="text-xs text-white/60 mb-1">LCP</div>
                  <div className={`text-sm font-bold ${
                    (currentMetrics?.lcp || 0) <= 2500 ? 'text-green-400' : 
                    (currentMetrics?.lcp || 0) <= 4000 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentMetrics ? `${currentMetrics.lcp.toFixed(0)}ms` : '-'}
                  </div>
                </div>
                
                <div className="glass-card p-3 text-center">
                  <div className="text-xs text-white/60 mb-1">FID</div>
                  <div className={`text-sm font-bold ${
                    (currentMetrics?.fid || 0) <= 100 ? 'text-green-400' : 
                    (currentMetrics?.fid || 0) <= 300 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentMetrics ? `${currentMetrics.fid.toFixed(0)}ms` : '-'}
                  </div>
                </div>
                
                <div className="glass-card p-3 text-center">
                  <div className="text-xs text-white/60 mb-1">CLS</div>
                  <div className={`text-sm font-bold ${
                    (currentMetrics?.cls || 0) <= 0.1 ? 'text-green-400' : 
                    (currentMetrics?.cls || 0) <= 0.25 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {currentMetrics ? currentMetrics.cls.toFixed(3) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Runtime Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white/80">Runtime Performance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    Memory Usage
                  </span>
                  <span className="font-mono text-white">
                    {currentMetrics ? `${(currentMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB` : '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    DOM Nodes
                  </span>
                  <span className="font-mono text-white">
                    {currentMetrics ? currentMetrics.domNodes.toLocaleString() : '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Render Time
                  </span>
                  <span className="font-mono text-white">
                    {currentMetrics ? `${currentMetrics.renderTime.toFixed(1)}ms` : '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Connection
                  </span>
                  <span className="font-mono text-white">
                    {currentMetrics ? currentMetrics.connectionType : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            {metrics.length > 1 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/80">Performance Trend</h4>
                <div className="h-32">
                  <EnhancedLineChart
                    data={metrics.slice(-20).map(m => ({
                      name: new Date(m.timestamp).toLocaleTimeString(),
                      memory: m.memoryUsage / 1024 / 1024,
                      render: m.renderTime,
                      nodes: m.domNodes / 100
                    }))}
                    lines={[
                      { dataKey: 'memory', color: '#3b82f6', name: 'Memory (MB)' },
                      { dataKey: 'render', color: '#8b5cf6', name: 'Render (ms)' },
                      { dataKey: 'nodes', color: '#4ade80', name: 'DOM Nodes (x100)' }
                    ]}
                    height={120}
                    showGrid={false}
                    animated={false}
                  />
                </div>
              </div>
            )}

            {/* Recent Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/80">Recent Alerts</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 glass-card text-xs"
                    >
                      {alert.type === 'error' ? (
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-white/80">{alert.message}</p>
                        <p className="text-white/50 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAlerts([])}
                className="glass-button-secondary text-xs flex-1"
              >
                Clear Alerts
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMetrics([]);
                  setAlerts([]);
                }}
                className="glass-button-secondary text-xs flex-1"
              >
                Reset Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}