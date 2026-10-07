'use client'
import { cn } from '@/lib/utils'
import React from 'react'

export function Table({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-[var(--border)]">{children}</thead>
}

export function TableBody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-[var(--secondary)] transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-3 py-3 text-sm', className)} {...props}>
      {children}
    </td>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-[var(--muted-foreground)] font-medium">{title}</p>
      {description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
