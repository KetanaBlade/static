import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'amber';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
    outline: 'text-foreground border-border',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-semibold dark:bg-emerald-950/40 dark:text-emerald-400',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-600 font-semibold dark:bg-amber-950/40 dark:text-amber-400',
    amber: 'border-amber-500/30 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
