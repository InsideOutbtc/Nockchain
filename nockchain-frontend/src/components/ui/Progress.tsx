import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  showPercentage = false,
  label,
  animated = false,
  striped = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Auto-determine variant based on percentage if default
  const autoVariant = variant === 'default' 
    ? percentage >= 80 ? 'success' 
    : percentage >= 60 ? 'warning' 
    : percentage >= 40 ? 'info'
    : 'error'
    : variant;

  return (
    <div className={cn('w-full', className)} {...props}>
      {/* Label and Percentage */}
      {(showLabel || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {showLabel && (
            <span className="text-sm font-medium text-white">
              {label || 'Progress'}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-white/70">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Progress Bar Container */}
      <div
        className={cn(
          'glass-progress w-full overflow-hidden',
          {
            'h-1': size === 'sm',
            'h-2': size === 'md',
            'h-3': size === 'lg',
          }
        )}
      >
        {/* Progress Bar Fill */}
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out relative',
            // Color variants
            {
              'bg-gradient-to-r from-nock-blue-500 to-nock-purple-500': autoVariant === 'default',
              'bg-gradient-to-r from-green-500 to-green-400': autoVariant === 'success',
              'bg-gradient-to-r from-yellow-500 to-orange-400': autoVariant === 'warning',
              'bg-gradient-to-r from-red-500 to-red-400': autoVariant === 'error',
              'bg-gradient-to-r from-blue-500 to-cyan-400': autoVariant === 'info',
            },
            // Striped effect
            {
              'bg-gradient-to-r': !striped,
              'bg-striped': striped,
            },
            // Animation
            {
              'animate-pulse': animated,
            }
          )}
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Value Display */}
      {!showPercentage && (showLabel || label) && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-white/60">
            {value.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  variant = 'default',
  showLabel = true,
  label,
  animated = false,
  className
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    default: 'stroke-nock-blue-500',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    error: 'stroke-red-500',
    info: 'stroke-blue-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            colors[variant],
            'transition-all duration-500 ease-out',
            {
              'animate-pulse': animated,
            }
          )}
        />
      </svg>
      
      {/* Center Label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-bold text-white">
              {Math.round(percentage)}%
            </div>
            {label && (
              <div className="text-xs text-white/60">
                {label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Multi Progress Component (for showing multiple values)
interface MultiProgressProps {
  values: Array<{
    value: number;
    label?: string;
    color?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  className?: string;
}

export function MultiProgress({
  values,
  max = 100,
  size = 'md',
  showLegend = true,
  className
}: MultiProgressProps) {
  const colors = {
    default: 'bg-nock-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div
        className={cn(
          'glass-progress w-full overflow-hidden flex',
          {
            'h-1': size === 'sm',
            'h-2': size === 'md',
            'h-3': size === 'lg',
          }
        )}
      >
        {values.map((item, index) => {
          const percentage = Math.min(Math.max((item.value / max) * 100, 0), 100);
          return (
            <div
              key={index}
              className={cn(
                'h-full transition-all duration-500',
                item.color || colors[item.variant || 'default']
              )}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-3">
          {values.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-3 h-3 rounded-sm',
                  item.color || colors[item.variant || 'default']
                )}
              />
              <span className="text-sm text-white/70">
                {item.label || `Value ${index + 1}`}: {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}