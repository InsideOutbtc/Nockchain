import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'large' | 'interactive' | 'glass';
  hover?: boolean;
  loading?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  hover = false,
  loading = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        // Base glass card styles
        'glass-card',
        // Variants
        {
          'glass-card-lg': variant === 'large',
          'glass-interactive': variant === 'interactive',
          'glass-card-hover': hover,
          'glass-loading': loading,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  gradient?: boolean;
}

export function CardTitle({
  children,
  className,
  gradient = false,
  ...props
}: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight text-white',
        {
          'gradient-text': gradient,
        },
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-white/70', className)}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  loading = false
}: StatsCardProps) {
  return (
    <Card hover loading={loading}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium text-white/70">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-white">{value}</p>
              {change && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    {
                      'text-green-400 bg-green-400/10': changeType === 'positive',
                      'text-red-400 bg-red-400/10': changeType === 'negative',
                      'text-white/70 bg-white/10': changeType === 'neutral',
                    }
                  )}
                >
                  {change}
                </span>
              )}
            </div>
          </div>
          {icon && (
            <div className="text-nock-blue-400 opacity-80">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}

export function FeatureCard({
  title,
  description,
  icon,
  href,
  onClick
}: FeatureCardProps) {
  const Component = href ? 'a' : 'div';
  
  return (
    <Card
      as={Component}
      href={href}
      onClick={onClick}
      variant="interactive"
      className="cursor-pointer group"
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="text-nock-blue-400 group-hover:text-nock-purple-400 transition-colors">
            {icon}
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-white group-hover:text-nock-blue-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-white/70">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}