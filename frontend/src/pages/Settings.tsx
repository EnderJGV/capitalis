import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  CheckIcon,
  KeyboardIcon,
  Loader2Icon,
  LogOutIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  SlidersHorizontalIcon,
  SunIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { CurrencyPicker } from '@/components/app/CurrencyPicker'
import { FlagIcon } from '@/components/app/FlagIcon'
import { IconInput } from '@/components/app/IconInput'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'
import { LANGUAGES } from '@/i18n/languages'
import { messagesFor } from '@/i18n/runtime'
import { cn } from '@/lib/utils'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

/** Todo lo configurable de la cuenta en un solo lugar: perfil, preferencias, atajos y sesión. */
export default function Settings() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t.settings.title} />
      <p className="-mt-3 mb-6 type-meta text-muted-foreground sm:-mt-4">{t.settings.autosave}</p>

      <div className="flex max-w-4xl flex-col gap-4">
        <ProfileSection />
        <PreferencesSection />
        <ShortcutsSection />
        <SessionSection />
      </div>
    </>
  )
}

/** Tarjeta de sección: título y descripción a la izquierda (escritorio) y controles a la derecha. */
function Section({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="type-heading flex items-center gap-2">
          <Icon className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          {title}
        </h2>
        <p className="mt-1 type-meta text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  )
}

function Field({ label, description, htmlFor, children }: { label: string; description?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label htmlFor={htmlFor}>{label}</Label>
        {description && <p className="mt-1 type-caption text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function ProfileSection() {
  const { t } = useI18n()
  const { user, setName } = useAuth()
  const [name, setNameValue] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  if (!user) return null

  const changed = name.trim() !== '' && name.trim() !== user.name

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!changed) return
    setSaving(true)
    try {
      await setName(name.trim())
      toast.success(t.settings.profileSaved)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.profileError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section icon={UserIcon} title={t.settings.profile} description={t.settings.profileDescription}>
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {initials(user.name) || '?'}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate type-meta text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <Label htmlFor="settings-name">{t.settings.name}</Label>
        <div className="flex gap-2">
          <IconInput
            icon={UserIcon}
            id="settings-name"
            className="h-10"
            autoComplete="name"
            maxLength={100}
            required
            value={name}
            onChange={(e) => setNameValue(e.target.value)}
          />
          <Button type="submit" size="lg" className="h-10 shrink-0" disabled={!changed || saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
            {t.common.save}
          </Button>
        </div>
      </form>

      <Field label={t.settings.email} description={t.settings.emailHint} htmlFor="settings-email">
        <IconInput icon={MailIcon} id="settings-email" className="h-10" value={user.email} readOnly disabled />
      </Field>
    </Section>
  )
}

function PreferencesSection() {
  const { t, lang, setLanguage } = useI18n()
  const { user, setCurrency } = useAuth()
  const { theme = 'system', setTheme } = useTheme()
  if (!user) return null

  const themes = [
    { value: 'system', label: t.user.themeSystem, icon: MonitorIcon },
    { value: 'light', label: t.user.themeLight, icon: SunIcon },
    { value: 'dark', label: t.user.themeDark, icon: MoonIcon },
  ]

  return (
    <Section icon={SlidersHorizontalIcon} title={t.settings.preferences} description={t.settings.preferencesDescription}>
      <Field label={t.settings.language} description={t.settings.languageDescription}>
        <div role="radiogroup" aria-label={t.settings.language} className="grid gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => (
            <ChoiceCard
              key={l.code}
              selected={lang === l.code}
              onSelect={() =>
                setLanguage(l.code)
                  .then(() => toast.success(messagesFor(l.code).user.languageSaved))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              <FlagIcon lang={l.code} className="h-[18px] w-[27px]" />
              {l.name}
            </ChoiceCard>
          ))}
        </div>
      </Field>

      <Field label={t.settings.currency} description={t.settings.currencyDescription} htmlFor="settings-currency">
        <CurrencyPicker
          id="settings-currency"
          className="sm:w-96"
          value={user.currency}
          onChange={(c) =>
            setCurrency(c)
              .then(() => toast.success(t.settings.currencySaved))
              .catch((e: Error) => toast.error(e.message))
          }
        />
      </Field>

      <Field label={t.settings.theme} description={t.settings.themeDescription}>
        <div role="radiogroup" aria-label={t.settings.theme} className="grid grid-cols-3 gap-2">
          {themes.map((option) => (
            <ChoiceCard key={option.value} selected={theme === option.value} onSelect={() => setTheme(option.value)} vertical>
              <option.icon className="size-5" strokeWidth={1.75} />
              {option.label}
            </ChoiceCard>
          ))}
        </div>
      </Field>
    </Section>
  )
}

function ChoiceCard({
  selected,
  onSelect,
  vertical = false,
  children,
}: {
  selected: boolean
  onSelect: () => void
  vertical?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative flex items-center gap-3 rounded-lg border px-3.5 type-meta font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        vertical ? 'h-20 flex-col justify-center gap-1.5' : 'h-12',
        selected ? 'border-primary bg-primary/10 text-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
      {selected && (
        <CheckIcon className={cn('size-4 text-primary', vertical ? 'absolute top-2 right-2' : 'ml-auto')} aria-hidden />
      )}
    </button>
  )
}

function ShortcutsSection() {
  const { t } = useI18n()
  const shortcuts = [
    { keys: ['N'], label: t.settings.shortcutNew },
    { keys: [IS_MAC ? '⌘' : 'Ctrl', 'B'], label: t.settings.shortcutSidebar },
    { keys: ['Esc'], label: t.settings.shortcutClose },
  ]
  return (
    <Section icon={KeyboardIcon} title={t.settings.shortcuts} description={t.settings.shortcutsDescription}>
      <ul className="divide-y rounded-lg border">
        {shortcuts.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-4 px-4 py-3 type-meta">
            {s.label}
            <span className="flex gap-1">
              {s.keys.map((k) => (
                <kbd key={k} className="min-w-7 rounded-md border bg-muted px-2 py-0.5 text-center type-caption font-semibold">
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function SessionSection() {
  const { t } = useI18n()
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <Section icon={LogOutIcon} title={t.settings.session} description={t.settings.sessionDescription}>
      <div>
        <Button
          variant="destructive"
          size="lg"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOutIcon />
          {t.settings.logout}
        </Button>
      </div>
    </Section>
  )
}

