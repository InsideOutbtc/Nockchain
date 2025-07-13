import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X,
  AlertCircle
} from 'lucide-react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode | boolean;
  actions?: ReactNode;
}

export function Alert({
  children,
  className,
  variant = 'info',
  size = 'md',
  title,
  dismissible = false,
  onDismiss,
  icon = true,
  actions,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
  };

  const defaultIcon = typeof icon === 'boolean' ? (icon ? icons[variant] : null) : icon;

  return (
    <div
      className={cn(
        // Base styles
        'glass-alert rounded-lg',
        // Size variants
        {
          'p-3': size === 'sm',
          'p-4': size === 'md',
          'p-6': size === 'lg',
        },
        // Color variants
        {
          'glass-alert-info': variant === 'info',
          'glass-alert-success': variant === 'success',
          'glass-alert-warning': variant === 'warning',
          'glass-alert-error': variant === 'error',
        },
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {defaultIcon && (
          <div className="flex-shrink-0 mt-0.5">
            {defaultIcon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn(
              'font-semibold mb-1',
              {
                'text-sm': size === 'sm',
                'text-base': size === 'md',
                'text-lg': size === 'lg',
              }
            )}>
              {title}
            </h4>
          )}
          
          <div className={cn(
            {
              'text-sm': size === 'sm',
              'text-sm': size === 'md',
              'text-base': size === 'lg',
            }
          )}>
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded-md p-1.5 hover:bg-white/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Simple Alert variants for quick use
export function InfoAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="info" {...props} />;
}

export function SuccessAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="success" {...props} />;
}

export function WarningAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="warning" {...props} />;
}

export function ErrorAlert(props: Omit<AlertProps, 'variant'>) {
  return <Alert variant="error" {...props} />;
}

// Inline Alert Component (smaller, inline style)
interface InlineAlertProps {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
}

export function InlineAlert({ 
  children, 
  variant = 'info', 
  className 
}: InlineAlertProps) {
  const icons = {
    info: <Info className="w-4 h-4" />,
    success: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
        {
          'bg-blue-500/10 text-blue-400 border border-blue-500/20': variant === 'info',
          'bg-green-500/10 text-green-400 border border-green-500/20': variant === 'success',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20': variant === 'warning',
          'bg-red-500/10 text-red-400 border border-red-500/20': variant === 'error',
        },
        className
      )}
    >
      {icons[variant]}
      {children}
    </div>
  );
}

// Toast Alert Component (for notifications)
interface ToastAlertProps extends Omit<AlertProps, 'dismissible'> {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function ToastAlert({
  position = 'top-right',
  autoClose = true,
  autoCloseDelay = 5000,
  onDismiss,
  ...props
}: ToastAlertProps) {
  // Auto-close functionality would be handled by a toast provider/manager
  // This is just the UI component

  return (
    <div
      className={cn(
        'fixed z-50 max-w-sm',
        {
          'top-4 right-4': position === 'top-right',
          'top-4 left-4': position === 'top-left',
          'bottom-4 right-4': position === 'bottom-right',
          'bottom-4 left-4': position === 'bottom-left',
          'top-4 left-1/2 transform -translate-x-1/2': position === 'top-center',
          'bottom-4 left-1/2 transform -translate-x-1/2': position === 'bottom-center',
        }
      )}
    >
      <Alert
        dismissible
        onDismiss={onDismiss}
        className="shadow-xl backdrop-blur-xl"
        {...props}
      />
    </div>
  );
}

// Alert Dialog Component
interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  actions?: ReactNode;
  children?: ReactNode;
}

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  variant = 'info',
  actions,
  children
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-modal w-full max-w-md p-6">
          <Alert variant={variant} size="lg" title={title}>
            <p className="text-white/80">
              {description}
            </p>
            
            {children}
            
            {actions && (
              <div className="flex gap-3 mt-4 justify-end">
                {actions}
              </div>
            )}
          </Alert>
        </div>
      </div>
    </>
  );
}