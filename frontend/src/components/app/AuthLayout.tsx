import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { ChartPieIcon, LogInIcon, MoonIcon, ShieldCheckIcon, SunIcon, UserPlusIcon, ZapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { AuthShowcase } from './AuthShowcase'
import { BrandBackdrop } from './BrandBackdrop'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

const FEATURE_ICONS = [ZapIcon, ChartPieIcon, ShieldCheckIcon]

/**
 * Layout compartido por /login y /registro: el panel de marca no se vuelve a montar al cambiar
 * de pantalla, y las pestañas deslizan su indicador entre "Entrar" y "Crear cuenta".
 */
export function AuthLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-dvh flex-col bg-sidebar lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:bg-background">
      <BrandPanel />

      <main className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background lg:mt-0 lg:rounded-none">
        <div className="hidden justify-end p-6 lg:flex">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 justify-center px-5 pt-7 pb-8 sm:px-8 lg:items-center lg:pt-0">
          <div className="w-full max-w-sm">
            <AuthTabs />
            {/* La clave reinicia la cascada de entrada al cambiar de pestaña. */}
            <div key={pathname} className="mt-7">
              <Outlet />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <LanguageSwitcher />
          <p className="type-caption text-muted-foreground">© {new Date().getFullYear()} Capitalis</p>
        </div>
      </main>
    </div>
  )
}

function BrandPanel() {
  const { t } = useI18n()
  return (
    <aside className="relative overflow-hidden bg-sidebar px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-12 text-sidebar-foreground sm:px-8 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-14">
      <BrandBackdrop />

      <div className="relative flex items-center justify-between">
        <Logo inverted alwaysShowName />
        <ThemeToggle onDark className="lg:hidden" />
      </div>

      {/* Móvil y tablet: frase corta + vista previa compacta */}
      <div className="relative mt-6 lg:hidden">
        <p className="mb-4 max-w-xs type-heading text-sidebar-accent-foreground">{t.auth.heroMobile}</p>
        <AuthShowcase variant="compact" className="max-w-md" />
      </div>

      {/* Escritorio: propuesta de valor, vista previa completa y beneficios */}
      <div className="relative hidden max-w-lg lg:block">
        <Reveal>
          <h2 className="type-title text-sidebar-accent-foreground">{t.auth.heroTitle}</h2>
        </Reveal>
        <Reveal step={1}>
          <p className="mt-3">{t.auth.heroSubtitle}</p>
        </Reveal>
        <Reveal step={2} className="my-14 pr-6 pl-8">
          <AuthShowcase />
        </Reveal>
        <ul className="flex flex-col gap-3">
          {t.auth.features.map((text, i) => {
            const Icon = FEATURE_ICONS[i] ?? ZapIcon
            return (
              <Reveal as="li" key={i} step={3 + i} className="flex items-center gap-3 type-meta">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sidebar-accent-foreground">
                  <Icon className="size-4" />
                </span>
                {text}
              </Reveal>
            )
          })}
        </ul>
      </div>

      <p className="relative hidden type-caption lg:block">{t.auth.footer}</p>
    </aside>
  )
}

function AuthTabs() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const onRegister = pathname.startsWith('/registro')
  const tab =
    'relative z-10 flex h-10 items-center justify-center gap-2 rounded-lg type-meta font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 aria-[current=page]:text-foreground [&_svg]:size-4'

  return (
    <nav aria-label={t.auth.tabs} className="relative grid grid-cols-2 rounded-xl bg-muted p-1">
      <span
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: onRegister ? 'translateX(100%)' : 'none' }}
        aria-hidden
      />
      <NavLink to="/login" replace className={tab}>
        <LogInIcon />
        {t.auth.signIn}
      </NavLink>
      <NavLink to="/registro" replace className={tab}>
        <UserPlusIcon />
        {t.auth.signUp}
      </NavLink>
    </nav>
  )
}

function ThemeToggle({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const { t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={dark ? t.auth.useLight : t.auth.useDark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={cn(
        onDark && 'text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-accent-foreground',
        className,
      )}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
