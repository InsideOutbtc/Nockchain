import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  pulse?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  icon,
  pulse = false,
  removable = false,
  onRemove,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        // Base styles
        'glass-badge inline-flex items-center gap-1.5 font-medium transition-all duration-200',
        // Size variants
        {
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-3 py-1 text-sm': size === 'md',
          'px-4 py-1.5 text-base': size === 'lg',
        },
        // Color variants
        {
          'glass-badge': variant === 'default',
          'glass-badge-success': variant === 'success',
          'glass-badge-warning': variant === 'warning',
          'glass-badge-error': variant === 'error',
          'bg-nock-blue-500/20 border-nock-blue-500 text-nock-blue-400': variant === 'info',
          'bg-transparent border-white/30 text-white/80': variant === 'outline',
        },
        // Pulse effect
        {
          'animate-pulse': pulse,
        },
        className
      )}
      {...props}
    >
      {icon && (
        <span className="w-3 h-3">
          {icon}
        </span>
      )}
      
      {children}
      
      {removable && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove badge"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'maintenance' | 'error';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ 
  status, 
  showText = true, 
  size = 'md' 
}: StatusBadgeProps) {
  const statusConfig = {
    online: {
      variant: 'success' as const,
      text: 'Online',
      icon: (
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      ),
    },
    offline: {
      variant: 'error' as const,
      text: 'Offline',
      icon: (
        <div className="w-2 h-2 bg-red-400 rounded-full" />
      ),
    },
    warning: {
      variant: 'warning' as const,
      text: 'Warning',
      icon: (
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      ),
    },
    maintenance: {
      variant: 'info' as const,
      text: 'Maintenance',
      icon: (
        <div className="w-2 h-2 bg-blue-400 rounded-full" />
      ),
    },
    error: {
      variant: 'error' as const,
      text: 'Error',
      icon: (
        <div className="w-2 h-2 bg-red-500 rounded-full" />
      ),
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={config.icon}
    >
      {showText && config.text}
    </Badge>
  );
}

// Count Badge Component
interface CountBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99, 
  showZero = false,
  className 
}: CountBadgeProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant="error"
      size="sm"
      className={cn(
        'bg-red-500 border-red-500 text-white min-w-[20px] h-5 flex items-center justify-center px-1.5',
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}

// Tag Badge Component (for categories, tags, etc.)
interface TagBadgeProps {
  children: ReactNode;
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function TagBadge({
  children,
  color,
  removable = false,
  onRemove,
  onClick
}: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      size="sm"
      removable={removable}
      onRemove={onRemove}
      onClick={onClick}
      className={cn(
        'cursor-pointer hover:bg-white/5',
        color && `border-${color}-500 text-${color}-400 bg-${color}-500/10`
      )}
    >
      {children}
    </Badge>
  );
}

// Progress Badge Component
interface ProgressBadgeProps {
  current: number;
  total: number;
  unit?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function ProgressBadge({
  current,
  total,
  unit = '',
  variant = 'default'
}: ProgressBadgeProps) {
  const percentage = Math.round((current / total) * 100);
  
  // Auto-determine variant based on percentage if not specified
  const autoVariant = variant === 'default' 
    ? percentage >= 80 ? 'success' 
    : percentage >= 60 ? 'warning' 
    : 'error'
    : variant;

  return (
    <Badge variant={autoVariant} size="sm">
      {current.toLocaleString()}{unit} / {total.toLocaleString()}{unit} ({percentage}%)
    </Badge>
  );
}