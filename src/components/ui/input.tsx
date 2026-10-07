'use client'
import { cn } from '@/lib/utils'
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">
            {label}
            {props.required && <span className="text-[var(--destructive)] ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-1 text-sm',
            'placeholder:text-[var(--muted-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--destructive)]',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">
            {label}
            {props.required && <span className="text-[var(--destructive)] ml-1">*</span>}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-sm',
            'placeholder:text-[var(--muted-foreground)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y',
            error && 'border-[var(--destructive)]',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, options, placeholder, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">
            {label}
            {props.required && <span className="text-[var(--destructive)] ml-1">*</span>}
          </label>
        )}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-1 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[var(--destructive)]',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hint && !error && <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>}
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
