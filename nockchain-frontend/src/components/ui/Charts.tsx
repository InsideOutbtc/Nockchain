'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Card, CardContent, CardHeader } from './Card';
import { Badge } from './Badge';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

// Common chart color palette
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#06b6d4',
  gradient: {
    blue: ['#3b82f6', '#1d4ed8'],
    purple: ['#8b5cf6', '#7c3aed'],
    green: ['#4ade80', '#22c55e'],
    yellow: ['#fbbf24', '#f59e0b'],
    red: ['#f87171', '#ef4444']
  }
};

// Animated Number Component
export function AnimatedNumber({ 
  value, 
  duration = 1000, 
  prefix = '', 
  suffix = '',
  decimals = 0,
  className = ''
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(value * easeOutQuart);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Enhanced Line Chart
export function EnhancedLineChart({
  data,
  lines,
  height = 300,
  showGrid = true,
  showBrush = false,
  animated = true,
  className = ''
}: {
  data: any[];
  lines: {
    dataKey: string;
    color: string;
    name: string;
    strokeWidth?: number;
    dot?: boolean;
  }[];
  height?: number;
  showGrid?: boolean;
  showBrush?: boolean;
  animated?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <LineChart data={data}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        )}
        <XAxis 
          dataKey="name" 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <YAxis 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        />
        <Legend />
        
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={line.strokeWidth || 2}
            dot={line.dot !== false}
            name={line.name}
            animationDuration={animated ? 1000 : 0}
            animationDelay={animated ? index * 200 : 0}
          />
        ))}
        
        {showBrush && <Brush dataKey="name" height={30} stroke="rgba(255,255,255,0.3)" />}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Enhanced Area Chart
export function EnhancedAreaChart({
  data,
  areas,
  height = 300,
  showGrid = true,
  stacked = false,
  animated = true,
  className = ''
}: {
  data: any[];
  areas: {
    dataKey: string;
    color: string;
    name: string;
    fillOpacity?: number;
  }[];
  height?: number;
  showGrid?: boolean;
  stacked?: boolean;
  animated?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data} stackOffset={stacked ? 'silhouette' : 'none'}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        )}
        <XAxis 
          dataKey="name" 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <YAxis 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        />
        <Legend />
        
        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stackId={stacked ? "1" : undefined}
            stroke={area.color}
            fill={area.color}
            fillOpacity={area.fillOpacity || 0.3}
            name={area.name}
            animationDuration={animated ? 1000 : 0}
            animationDelay={animated ? index * 200 : 0}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Enhanced Bar Chart
export function EnhancedBarChart({
  data,
  bars,
  height = 300,
  showGrid = true,
  animated = true,
  className = ''
}: {
  data: any[];
  bars: {
    dataKey: string;
    color: string;
    name: string;
    radius?: number;
  }[];
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <BarChart data={data}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        )}
        <XAxis 
          dataKey="name" 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <YAxis 
          stroke="rgba(255,255,255,0.6)"
          fontSize={12}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        />
        <Legend />
        
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name}
            radius={bar.radius || [4, 4, 0, 0]}
            animationDuration={animated ? 1000 : 0}
            animationDelay={animated ? index * 200 : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Enhanced Pie Chart
export function EnhancedPieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius = 100,
  showLabels = true,
  animated = true,
  className = ''
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  animated?: boolean;
  className?: string;
}) {
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderLabel : false}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
          animationDuration={animated ? 1000 : 0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Real-time Chart Component
export function RealtimeChart({
  title,
  value,
  change,
  data,
  dataKey = 'value',
  color = CHART_COLORS.primary,
  height = 200,
  showChange = true,
  className = ''
}: {
  title: string;
  value: number;
  change?: number;
  data: any[];
  dataKey?: string;
  color?: string;
  height?: number;
  showChange?: boolean;
  className?: string;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const isPositive = change && change > 0;

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {showChange && change !== undefined && (
            <Badge variant={isPositive ? 'success' : 'error'} className="flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(change).toFixed(2)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-3xl font-bold text-white">
            <AnimatedNumber value={animatedValue} decimals={2} />
          </div>
          
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                fillOpacity={1}
                fill={`url(#gradient-${title})`}
                strokeWidth={2}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Metric Card with Chart
export function MetricCard({
  title,
  value,
  change,
  icon,
  chartData,
  chartType = 'line',
  color = CHART_COLORS.primary,
  className = ''
}: {
  title: string;
  value: number | string;
  change?: number;
  icon?: React.ReactNode;
  chartData?: any[];
  chartType?: 'line' | 'area' | 'bar';
  color?: string;
  className?: string;
}) {
  const isPositive = typeof change === 'number' && change > 0;

  const renderMiniChart = () => {
    if (!chartData) return null;

    const commonProps = {
      width: '100%',
      height: 60,
      data: chartData
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={`glass-card ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-xl glass-card glass-glow flex items-center justify-center" style={{ color }}>
                  {icon}
                </div>
              )}
              <div>
                <p className="text-sm text-white/70">{title}</p>
                <p className="text-2xl font-bold text-white">
                  {typeof value === 'number' ? (
                    <AnimatedNumber value={value} decimals={2} />
                  ) : (
                    value
                  )}
                </p>
              </div>
            </div>
            
            {typeof change === 'number' && (
              <Badge variant={isPositive ? 'success' : 'error'} className="flex items-center gap-1">
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change).toFixed(1)}%
              </Badge>
            )}
          </div>
          
          {chartData && (
            <div className="h-15">
              {renderMiniChart()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Heatmap Chart
export function HeatmapChart({
  data,
  xAxisKey,
  yAxisKey,
  valueKey,
  colorScale = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'],
  height = 300,
  className = ''
}: {
  data: any[];
  xAxisKey: string;
  yAxisKey: string;
  valueKey: string;
  colorScale?: string[];
  height?: number;
  className?: string;
}) {
  const maxValue = Math.max(...data.map(d => d[valueKey]));
  const minValue = Math.min(...data.map(d => d[valueKey]));

  const getColor = (value: number) => {
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const index = Math.floor(normalizedValue * (colorScale.length - 1));
    return colorScale[index] || colorScale[0];
  };

  return (
    <div className={`glass-card p-6 ${className}`} style={{ height }}>
      <div className="grid gap-1 h-full" style={{ 
        gridTemplateColumns: `repeat(${[...new Set(data.map(d => d[xAxisKey]))].length}, 1fr)`,
        gridTemplateRows: `repeat(${[...new Set(data.map(d => d[yAxisKey]))].length}, 1fr)`
      }}>
        {data.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01 }}
            className="rounded-sm flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: getColor(item[valueKey]) }}
            title={`${item[xAxisKey]} - ${item[yAxisKey]}: ${item[valueKey]}`}
          >
            {item[valueKey]}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Export chart utilities
export const ChartUtils = {
  formatValue: (value: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
    switch (type) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  },
  
  generateGradient: (colors: string[]) => ({
    backgroundImage: `linear-gradient(45deg, ${colors.join(', ')})`
  }),
  
  getColorByValue: (value: number, min: number, max: number, colors = CHART_COLORS.gradient.blue) => {
    const normalizedValue = (value - min) / (max - min);
    return normalizedValue > 0.5 ? colors[1] : colors[0];
  }
};

export { CHART_COLORS };