import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant = 'default',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'glass-button inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nock-blue-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:pointer-events-none',
          // Size variants
          {
            'px-3 py-1.5 text-xs rounded-md': size === 'sm',
            'px-4 py-2 text-sm rounded-lg': size === 'md',
            'px-6 py-3 text-base rounded-lg': size === 'lg',
            'px-8 py-4 text-lg rounded-xl': size === 'xl',
          },
          // Color variants
          {
            'glass-button': variant === 'default',
            'glass-button-primary': variant === 'primary',
            'glass-button-success': variant === 'success',
            'bg-gradient-to-r from-red-500 to-red-600 border-red-500 hover:from-red-400 hover:to-red-500 hover:border-red-400': variant === 'danger',
            'bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-500 hover:from-yellow-400 hover:to-orange-400 hover:border-yellow-400': variant === 'warning',
            'bg-transparent border-transparent hover:bg-white/5': variant === 'ghost',
            'bg-transparent border-white/20 hover:bg-white/5 hover:border-white/30': variant === 'outline',
          },
          // Full width
          {
            'w-full': fullWidth,
          },
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="w-4 h-4">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="w-4 h-4">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon Button Component
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          'p-0 aspect-square',
          {
            'w-8 h-8': size === 'sm',
            'w-10 h-10': size === 'md',
            'w-12 h-12': size === 'lg',
            'w-14 h-14': size === 'xl',
          },
          className
        )}
        {...props}
      >
        <span className="w-4 h-4">{icon}</span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Button Group Component
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  spacing = 'md'
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex',
        {
          'flex-row': orientation === 'horizontal',
          'flex-col': orientation === 'vertical',
          'gap-1': spacing === 'sm',
          'gap-2': spacing === 'md',
          'gap-4': spacing === 'lg',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

// Floating Action Button
interface FABProps extends Omit<ButtonProps, 'variant' | 'size'> {
  icon: ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FloatingActionButton({
  icon,
  className,
  position = 'bottom-right',
  ...props
}: FABProps) {
  return (
    <Button
      className={cn(
        'fixed z-50 w-14 h-14 rounded-full shadow-lg glass-glow p-0',
        {
          'bottom-6 right-6': position === 'bottom-right',
          'bottom-6 left-6': position === 'bottom-left',
          'top-6 right-6': position === 'top-right',
          'top-6 left-6': position === 'top-left',
        },
        className
      )}
      variant="primary"
      {...props}
    >
      <span className="w-6 h-6">{icon}</span>
    </Button>
  );
}

// Copy Button Component
interface CopyButtonProps {
  value: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CopyButton({ value, className, size = 'sm' }: CopyButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <IconButton
      onClick={handleCopy}
      variant="ghost"
      size={size}
      className={className}
      aria-label="Copy to clipboard"
      icon={
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      }
    />
  );
}