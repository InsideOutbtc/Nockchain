'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  variant?: 'default' | 'pulse' | 'bounce' | 'glow' | 'enterprise';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'white';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  variant = 'default',
  size = 'md',
  color = 'blue',
  text,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
    white: 'text-white'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  if (variant === 'default') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className={`${sizeClasses[size]} ${colorClasses[color]}`}
        >
          <Loader2 className="w-full h-full" />
        </motion.div>
        {text && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className={`${sizeClasses[size]} ${colorClasses[color]}`}
        >
          <Activity className="w-full h-full" />
        </motion.div>
        {text && (
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'bounce') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          className={`${sizeClasses[size]} ${colorClasses[color]}`}
        >
          <Zap className="w-full h-full" />
        </motion.div>
        {text && (
          <motion.p
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0px ${color === 'blue' ? '#3b82f6' : color === 'green' ? '#4ade80' : color === 'purple' ? '#8b5cf6' : '#fbbf24'}`,
              `0 0 20px ${color === 'blue' ? '#3b82f6' : color === 'green' ? '#4ade80' : color === 'purple' ? '#8b5cf6' : '#fbbf24'}`,
              `0 0 0px ${color === 'blue' ? '#3b82f6' : color === 'green' ? '#4ade80' : color === 'purple' ? '#8b5cf6' : '#fbbf24'}`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full p-2 glass-card`}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-full h-full"
          >
            <Loader2 className="w-full h-full" />
          </motion.div>
        </motion.div>
        {text && (
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'enterprise') {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={`${sizeClasses[size]} border-2 border-transparent rounded-full`}
            style={{
              background: `conic-gradient(from 0deg, transparent, ${
                color === 'blue' ? '#3b82f6' : 
                color === 'green' ? '#4ade80' : 
                color === 'purple' ? '#8b5cf6' : 
                color === 'yellow' ? '#fbbf24' : '#ffffff'
              })`,
              WebkitMask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px))',
              mask: 'radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 2px))'
            }}
          />
          <div className={`absolute inset-2 rounded-full glass-card flex items-center justify-center ${colorClasses[color]}`}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <Zap className="w-1/2 h-1/2" />
            </motion.div>
          </div>
        </div>
        {text && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className={`${textSizeClasses[size]} text-white font-semibold mb-1`}>
              {text}
            </p>
            <motion.div
              animate={{ width: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`h-0.5 bg-gradient-to-r from-transparent via-${color}-400 to-transparent rounded-full`}
            />
          </motion.div>
        )}
      </div>
    );
  }

  return null;
}

// Skeleton Loading Components
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-white/10 rounded-xl" />
          <div className="w-16 h-6 bg-white/10 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-24 bg-white/10 rounded" />
          <div className="h-4 w-20 bg-white/5 rounded" />
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full">
          <motion.div
            animate={{ x: [-100, 200] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
          />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) {
  return (
    <div className={`glass-card ${className}`}>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
          ))}
        </div>
        
        {/* Separator */}
        <div className="h-px bg-white/10" />
        
        {/* Rows */}
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <motion.div
              key={rowIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: rowIndex * 0.1 }}
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-6 bg-white/5 rounded animate-pulse"
                  style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s` }}
                />
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="animate-pulse space-y-6">
        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-white/10 rounded" />
          <div className="h-4 w-16 bg-white/10 rounded" />
        </div>
        
        {/* Chart Area */}
        <div className="relative h-48 bg-white/5 rounded-lg overflow-hidden">
          {/* Animated bars */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [20, Math.random() * 120 + 20, 20] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-full bg-gradient-to-t from-blue-500/30 to-blue-400/10 rounded-t"
              />
            ))}
          </div>
          
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: [-100, 300] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ width: '100px' }}
          />
        </div>
        
        {/* Chart Legend */}
        <div className="flex justify-center gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/10 rounded-full" />
              <div className="h-3 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Progressive Loading Component
export function ProgressiveLoader({ 
  steps = ['Connecting...', 'Loading data...', 'Optimizing...', 'Ready!'],
  currentStep = 0,
  className = ''
}: {
  steps?: string[];
  currentStep?: number;
  className?: string;
}) {
  return (
    <div className={`glass-card p-8 text-center space-y-6 ${className}`}>
      <LoadingSpinner variant="enterprise" size="lg" text="Initializing NOCKCHAIN Platform" />
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: index <= currentStep ? 1 : 0.3,
              x: 0
            }}
            transition={{ delay: index * 0.2 }}
            className="flex items-center gap-3"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              index < currentStep ? 'bg-green-500' :
              index === currentStep ? 'bg-blue-500 animate-pulse' : 'bg-white/10'
            }`}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span className={`text-sm ${
              index <= currentStep ? 'text-white' : 'text-white/50'
            }`}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>
      
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <motion.div
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
        />
      </div>
    </div>
  );
}