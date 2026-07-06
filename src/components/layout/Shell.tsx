"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Trophy,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', description: 'Visão geral' },
  { href: '/pos', icon: ShoppingCart, label: 'Frente de Caixa', description: 'PDV / Vendas' },
  { href: '/products', icon: Package, label: 'Produtos', description: 'Estoque' },
  { href: '/courts', icon: Trophy, label: 'Quadras', description: 'Futebol & Vôlei' },
  { href: '/schedule', icon: Calendar, label: 'Agenda', description: 'Reservas' },
  { href: '/sales', icon: BarChart3, label: 'Relatórios', description: 'Histórico' },
  { href: '/settings', icon: Settings, label: 'Configurações', description: 'Perfil' },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, hsl(221, 83%, 58%) 0%, hsl(199, 89%, 53%) 100%)' }}
          >
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">VM Gestão</h1>
            <p className="text-[10px] text-white/50 mt-0.5">Financeira</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90'
              )}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                  style={{ background: 'linear-gradient(to bottom, hsl(221, 83%, 58%), hsl(199, 89%, 53%))' }}
                />
              )}
              <item.icon className={cn('h-4 w-4 shrink-0 transition-transform', isActive ? 'scale-110' : 'group-hover:scale-110')} />
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-semibold truncate', isActive ? 'text-white' : '')}>
                  {item.label}
                </div>
                <div className="text-[10px] text-white/40 truncate">{item.description}</div>
              </div>
              {isActive && <ChevronRight className="h-3 w-3 text-white/40" />}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-2">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(221, 83%, 58%), hsl(199, 89%, 53%))' }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white/90 truncate">{user?.email}</div>
            <div className="text-[10px] text-white/40">Administrador</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/60 hover:bg-red-500/15 hover:text-red-400 transition-all text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          Sair do sistema
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop */}
      <aside
        className="hidden lg:flex w-64 flex-col h-full shrink-0"
        style={{ background: 'hsl(240, 15%, 12%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col animate-slide-in-left"
            style={{ background: 'hsl(240, 15%, 12%)' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b bg-card sticky top-0 z-30">
          <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(221, 83%, 53%), hsl(199, 89%, 48%))' }}
            >
              <Wallet className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">VM Gestão</span>
          </div>
          <Button variant="ghost" size="icon-sm">
            <Bell className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
