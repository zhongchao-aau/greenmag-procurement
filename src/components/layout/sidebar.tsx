'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, ShoppingCart, Truck, Package,
  FlaskConical, Boxes, Building2, LogOut, Magnet, ClipboardCheck
} from 'lucide-react'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const userNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'My Requests', icon: FileText },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/shipments', label: 'Shipments', icon: Truck },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/usage/new', label: 'Record Usage', icon: FlaskConical },
]

const adminOnlyNav = [
  { href: '/receiving', label: 'Receiving', icon: ClipboardCheck },
]

const masterNav = [
  { href: '/components', label: 'Components', icon: Boxes },
  { href: '/suppliers', label: 'Suppliers', icon: Building2 },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = profile.role === 'admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[var(--card)] border-r border-[var(--border)] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]">
          <Magnet className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--foreground)] leading-tight">GreenMag</p>
          <p className="text-xs text-[var(--muted-foreground)]">Procurement</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {userNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {isAdmin && adminOnlyNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href.replace('/new', '') + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-4 pb-1 px-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Master Data</p>
        </div>
        {masterNav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--border)] px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md">
          <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate capitalize">{profile.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
