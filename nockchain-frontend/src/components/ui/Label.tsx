import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'floating' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({
    className,
    children,
    required = false,
    disabled = false,
    variant = 'default',
    size = 'md',
    ...props
  }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          // Base styles
          'text-white font-medium transition-colors duration-200',
          // Size variants
          {
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg',
          },
          // Variant styles
          {
            'block mb-2': variant === 'default',
            'absolute left-3 top-2 text-white/70 pointer-events-none transition-all duration-200': variant === 'floating',
            'inline-flex items-center': variant === 'inline',
          },
          // States
          {
            'opacity-50 cursor-not-allowed': disabled,
            'text-white/90': !disabled,
          },
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-red-400 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';

// Form Group Component
interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

export function FormGroup({ 
  children, 
  className, 
  spacing = 'md' 
}: FormGroupProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        {
          'gap-2': spacing === 'sm',
          'gap-4': spacing === 'md',
          'gap-6': spacing === 'lg',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

// Field Group Component (Label + Input combination)
interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FieldGroup({
  label,
  children,
  error,
  helperText,
  required = false,
  disabled = false,
  className
}: FieldGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label required={required} disabled={disabled}>
        {label}
      </Label>
      {children}
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          error ? 'text-red-400' : 'text-white/60'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// Form Section Component
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className
}: FormSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-white/70">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}