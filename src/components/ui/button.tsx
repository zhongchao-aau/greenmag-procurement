'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50'
    const variants = {
      primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-blue-700',
      secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-slate-200',
      ghost: 'hover:bg-[var(--accent)] text-[var(--foreground)]',
      destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-red-700',
      outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] text-[var(--foreground)]',
    }
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-6 text-sm',
    }
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
