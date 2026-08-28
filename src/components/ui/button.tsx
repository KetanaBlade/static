import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none cursor-pointer';
    
    const variants = {
      default: 'bg-primary text-primary-foreground shadow-xs hover:brightness-105 border border-primary/30 active:scale-[0.98]',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs border border-destructive/30 active:scale-[0.98]',
      outline: 'border border-border text-foreground bg-card hover:bg-muted/40 hover:border-border hover:text-foreground shadow-xs transition-colors active:scale-[0.98]',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border active:scale-[0.98]',
      ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
      link: 'text-primary underline-offset-4 hover:underline',
      success: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs border border-emerald-700/30 active:scale-[0.98]',
    };

    const sizes = {
      default: 'h-10 px-4 py-2 min-h-[40px]',
      sm: 'h-9 px-3 text-xs min-h-[36px]',
      lg: 'h-11 px-6 text-base min-h-[44px]',
      icon: 'h-10 w-10 min-h-[40px] min-w-[40px]',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
