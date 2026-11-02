import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n/I18nProvider'
import { LANGUAGES } from '@/i18n/languages'
import { cn } from '@/lib/utils'
import { FlagIcon } from './FlagIcon'

/** Desplegable de idioma para las pantallas de acceso (antes de iniciar sesión). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, lang, setLanguage } = useI18n()
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          aria-label={`${t.user.language}: ${current.name}`}
          className={cn('h-10 gap-2 rounded-full bg-card pr-3 pl-3.5', className)}
        >
          <FlagIcon lang={current.code} />
          <span className="type-meta font-medium">{current.name}</span>
          <ChevronDownIcon className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-48">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLanguage(l.code)} className="h-10">
            <FlagIcon lang={l.code} />
            {l.name}
            {l.code === lang && <CheckIcon className="ml-auto text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
