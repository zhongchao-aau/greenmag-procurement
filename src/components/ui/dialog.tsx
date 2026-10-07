'use client'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger

export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string
  children: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <RadixDialog.Content
        className={cn(
          'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
          'w-full max-w-lg bg-[var(--card)] rounded-lg shadow-xl border border-[var(--border)]',
          'focus:outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
          className
        )}
      >
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="text-sm text-[var(--muted-foreground)] mt-1">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close className="rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </RadixDialog.Close>
        </div>
        <div className="p-6">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
