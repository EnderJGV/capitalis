import { useNavigate } from 'react-router-dom'
import { ChevronsUpDownIcon, LogOutIcon, SettingsIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

interface Props {
  /** "sidebar": barra lateral expandida. "rail": barra lateral contraída. "compact": solo avatar (móvil). */
  variant: 'sidebar' | 'rail' | 'compact'
}

/** Menú del usuario: acceso rápido a Configuración (donde está todo lo configurable) y salir. */
export function UserMenu({ variant }: Props) {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  if (!user) return null

  const inSidebar = variant !== 'compact'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.user.menu}
        className={cn(
          'flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3',
          inSidebar
            ? 'w-full p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-sidebar-ring/60 data-[state=open]:bg-sidebar-accent'
            : 'p-1 focus-visible:ring-ring/40',
          variant === 'rail' && 'justify-center',
        )}
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
            inSidebar ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-primary text-primary-foreground',
          )}
        >
          {initials(user.name) || '?'}
        </span>
        {variant === 'sidebar' && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate type-meta font-semibold text-sidebar-accent-foreground">{user.name}</span>
              <span className="block truncate type-caption">{user.email}</span>
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={inSidebar ? 'right' : 'bottom'} align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate type-meta font-semibold text-foreground">{user.name}</span>
          <span className="truncate font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/configuracion')}>
          <SettingsIcon />
          {t.user.settings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOutIcon />
          {t.user.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
