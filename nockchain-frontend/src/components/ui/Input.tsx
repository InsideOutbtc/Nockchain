import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Search, X } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'default' | 'search' | 'password';
  loading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type,
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    variant = 'default',
    loading = false,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [internalValue, setInternalValue] = useState(props.value || '');

    const inputType = variant === 'password' 
      ? (showPassword ? 'text' : 'password') 
      : type;

    const handleClearSearch = () => {
      setInternalValue('');
      if (props.onChange) {
        const event = {
          target: { value: '' }
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(event);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Left Icon */}
          {(leftIcon || variant === 'search') && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
              {variant === 'search' ? (
                <Search className="w-4 h-4" />
              ) : (
                leftIcon
              )}
            </div>
          )}

          {/* Input Field */}
          <input
            type={inputType}
            className={cn(
              'glass-input text-white placeholder-white/50',
              // Padding adjustments for icons
              {
                'pl-10': leftIcon || variant === 'search',
                'pr-10': rightIcon || variant === 'password' || (variant === 'search' && internalValue),
                'pr-16': variant === 'search' && internalValue && variant === 'password',
              },
              // Error state
              {
                'border-red-500 focus:border-red-400': error,
              },
              // Loading state
              {
                'opacity-50 cursor-not-allowed': loading,
              },
              className
            )}
            ref={ref}
            value={internalValue}
            onChange={handleChange}
            disabled={loading}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Search Clear Button */}
            {variant === 'search' && internalValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-white/50 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Password Toggle */}
            {variant === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/50 hover:text-white/70 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Custom Right Icon */}
            {rightIcon && variant !== 'password' && (
              <div className="text-white/50">
                {rightIcon}
              </div>
            )}

            {/* Loading Spinner */}
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white/70"></div>
            )}
          </div>
        </div>

        {/* Helper Text / Error */}
        {(error || helperText) && (
          <p className={cn(
            'mt-2 text-xs',
            error ? 'text-red-400' : 'text-white/60'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  loading?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    label,
    error,
    helperText,
    loading = false,
    ...props
  }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white mb-2">
            {label}
          </label>
        )}
        
        <textarea
          className={cn(
            'glass-input text-white placeholder-white/50 min-h-[80px] resize-vertical',
            // Error state
            {
              'border-red-500 focus:border-red-400': error,
            },
            // Loading state
            {
              'opacity-50 cursor-not-allowed': loading,
            },
            className
          )}
          ref={ref}
          disabled={loading}
          {...props}
        />

        {/* Helper Text / Error */}
        {(error || helperText) && (
          <p className={cn(
            'mt-2 text-xs',
            error ? 'text-red-400' : 'text-white/60'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Input Group Component
interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

export function InputGroup({ children, className }: InputGroupProps) {
  return (
    <div className={cn('flex rounded-lg overflow-hidden', className)}>
      {children}
    </div>
  );
}

// Number Input Component
interface NumberInputProps extends Omit<InputProps, 'type'> {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({
    min,
    max,
    step = 1,
    precision = 0,
    className,
    ...props
  }, ref) => {
    const formatNumber = (value: string) => {
      const num = parseFloat(value);
      if (isNaN(num)) return '';
      return precision > 0 ? num.toFixed(precision) : Math.round(num).toString();
    };

    return (
      <Input
        ref={ref}
        type="number"
        min={min}
        max={max}
        step={step}
        className={className}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';