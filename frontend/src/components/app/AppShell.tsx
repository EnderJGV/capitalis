import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
  TagsIcon,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { BrandBackdrop } from './BrandBackdrop'
import { Logo } from './Logo'
import { TransactionEditorProvider, useTransactionEditor } from './TransactionEditorProvider'
import { UserMenu } from './UserMenu'

interface NavItem {
  to: string
  /** Clave del texto en t.nav */
  key: 'summary' | 'movements' | 'categories' | 'settings'
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/', key: 'summary', icon: LayoutDashboardIcon },
  { to: '/movimientos', key: 'movements', icon: ArrowLeftRightIcon },
  { to: '/categorias', key: 'categories', icon: TagsIcon },
  { to: '/configuracion', key: 'settings', icon: SettingsIcon },
]

const COLLAPSED_KEY = 'capitalis-sidebar-collapsed'
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Preferencia de barra contraída, recordada en el navegador. Atajo: Ctrl/⌘ + B. */
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      } catch {
        // Sin almacenamiento disponible: la preferencia dura solo esta sesión.
      }
      return !c
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'b' && (e.ctrlKey || e.metaKey) && !e.altKey) {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return [collapsed, toggle]
}

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  // Tablet: siempre contraída. Escritorio: según la preferencia del usuario.
  const expanded = isDesktop && !collapsed

  return (
    <TransactionEditorProvider>
      <div className="min-h-dvh">
        <Sidebar expanded={expanded} canToggle={isDesktop} onToggle={toggleCollapsed} />
        <MobileTopBar />
        <main
          className={cn(
            'transition-[padding] duration-200 ease-out motion-reduce:transition-none sm:pl-[72px]',
            expanded && 'sm:pl-64',
          )}
        >
          <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 pb-28 sm:px-6 sm:pt-6 sm:pb-10 xl:px-10">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </TransactionEditorProvider>
  )
}

interface SidebarProps {
  expanded: boolean
  canToggle: boolean
  onToggle: () => void
}

/** Barra lateral: expandida (256px) o contraída a íconos (72px). Oculta en móvil. */
function Sidebar({ expanded, canToggle, onToggle }: SidebarProps) {
  const { t } = useI18n()
  const { openNew } = useTransactionEditor()
  const shortcut = IS_MAC ? '⌘B' : 'Ctrl+B'

  return (
    <aside
      data-expanded={expanded}
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none sm:flex',
        expanded ? 'w-64' : 'w-[72px]',
      )}
    >
      <BrandBackdrop className="opacity-50" />

      {/* Marca + contraer */}
      <div className={cn('relative flex h-16 shrink-0 items-center', expanded ? 'justify-between px-5' : 'justify-center')}>
        <Logo inverted alwaysShowName iconOnly={!expanded} />
        {expanded && canToggle && (
          <SidebarTooltip label={`${t.nav.collapse} (${shortcut})`} show>
            <button
              type="button"
              onClick={onToggle}
              aria-label={t.nav.collapse}
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
            >
              <PanelLeftCloseIcon className="size-4" />
            </button>
          </SidebarTooltip>
        )}
      </div>

      {/* Acción principal */}
      <div className={cn('relative mt-2', expanded ? 'px-4' : 'px-3')}>
        <SidebarTooltip label={`${t.nav.newMovement} (N)`} show={!expanded}>
          <button
            type="button"
            onClick={openNew}
            aria-label={t.nav.newMovement}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-sm shadow-black/10 transition-[filter,transform] outline-none hover:brightness-95 focus-visible:ring-3 focus-visible:ring-sidebar-ring/60 active:translate-y-px',
              expanded ? 'px-3 type-meta' : 'justify-center',
            )}
          >
            <PlusIcon className="size-[18px] shrink-0" strokeWidth={2.25} />
            {expanded && (
              <>
                <span className="flex-1 text-left">{t.nav.newMovement}</span>
                <kbd className="rounded border border-current/25 px-1.5 type-caption font-medium opacity-70">N</kbd>
              </>
            )}
          </button>
        </SidebarTooltip>
      </div>

      {/* Navegación */}
      <nav aria-label={t.nav.main} className={cn('relative mt-6 flex flex-1 flex-col gap-1', expanded ? 'px-4' : 'px-3')}>
        {expanded && <p className="mb-1 px-3 type-caption font-semibold text-sidebar-foreground/70">{t.nav.menu}</p>}
        {NAV.map((item) => (
          <SidebarTooltip key={item.to} label={t.nav[item.key]} show={!expanded}>
            {/* className como string: el Slot del Tooltip no admite la función de NavLink; el activo se marca con aria-current. */}
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={cn(
                'group relative flex h-10 items-center gap-3 rounded-lg type-meta font-medium whitespace-nowrap transition-colors outline-none',
                'hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/60',
                'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground',
                expanded ? 'px-3' : 'justify-center',
              )}
            >
              {/* Indicador del ítem activo */}
              <span
                aria-hidden
                className={cn(
                  'absolute top-1/2 h-5 w-1 -translate-y-1/2 scale-y-0 rounded-full bg-sidebar-primary transition-transform group-aria-[current=page]:scale-y-100',
                  expanded ? '-left-4' : '-left-3',
                )}
              />
              <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
              {expanded ? t.nav[item.key] : <span className="sr-only">{t.nav[item.key]}</span>}
            </NavLink>
          </SidebarTooltip>
        ))}
      </nav>

      {/* Pie: expandir (si está contraída) y usuario */}
      <div className={cn('relative flex flex-col gap-1 pb-4', expanded ? 'px-4' : 'px-3')}>
        {!expanded && canToggle && (
          <SidebarTooltip label={`${t.nav.expand} (${shortcut})`} show>
            <button
              type="button"
              onClick={onToggle}
              aria-label={t.nav.expand}
              className="flex h-10 items-center justify-center rounded-lg text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
            >
              <PanelLeftOpenIcon className="size-5" strokeWidth={1.75} />
            </button>
          </SidebarTooltip>
        )}
        <div className="border-t border-sidebar-border pt-3">
          <UserMenu variant={expanded ? 'sidebar' : 'rail'} />
        </div>
      </div>
    </aside>
  )
}

/** Tooltip a la derecha, solo cuando la barra está contraída (o cuando se pide explícitamente). */
function SidebarTooltip({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
  if (!show) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:hidden">
      <Logo />
      <UserMenu variant="compact" />
    </header>
  )
}

function BottomNav() {
  const { t } = useI18n()
  const { openNew } = useTransactionEditor()
  const [home, movements, categories, settings] = NAV
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <BottomNavLink item={home} />
      <BottomNavLink item={movements} />
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={openNew}
          aria-label={t.nav.newMovement}
          className="-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background outline-none focus-visible:ring-ring/60"
        >
          <PlusIcon className="size-6" strokeWidth={2.25} />
        </button>
      </div>
      <BottomNavLink item={categories} />
      <BottomNavLink item={settings} />
    </nav>
  )
}

function BottomNavLink({ item }: { item: NavItem }) {
  const { t } = useI18n()
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group flex h-16 flex-col items-center justify-center gap-1 type-caption font-medium outline-none focus-visible:bg-muted',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      {/* Píldora detrás del ícono activo, al estilo de las apps nativas */}
      <span className="flex h-7 w-14 items-center justify-center rounded-full transition-colors group-aria-[current=page]:bg-accent">
        <item.icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="max-w-full truncate px-1">{item.key === 'settings' ? t.nav.settingsShort : t.nav[item.key]}</span>
    </NavLink>
  )
}
