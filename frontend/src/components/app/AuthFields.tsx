import { useState } from 'react'
import { CircleAlertIcon, EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/I18nProvider'
import { format } from '@/i18n/runtime'
import { cn } from '@/lib/utils'

/** Contraseña con candado, botón para mostrarla y aviso de Bloq Mayús. */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  return (
    <div>
      <div className="relative">
        <LockIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type={visible ? 'text' : 'password'}
          className={cn('pr-11 pl-9', className)}
          onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
          onBlur={() => setCapsLock(false)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
      {capsLock && (
        <p className="mt-1.5 animate-fade-up type-caption text-muted-foreground motion-reduce:animate-none">
          {t.auth.capsLock}
        </p>
      )}
    </div>
  )
}

const LEVEL_COLORS = ['bg-expense', 'bg-expense', 'bg-chart-5', 'bg-income', 'bg-income']

function strength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return score
}

/** Medidor de 4 tramos; mientras la contraseña está vacía muestra el requisito mínimo. */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { t } = useI18n()
  if (!password) {
    return (
      <p id={id} className="type-caption text-muted-foreground">
        {t.auth.passwordHint}
      </p>
    )
  }
  const score = password.length < 8 ? 0 : strength(password)
  const color = LEVEL_COLORS[score]
  return (
    <div id={id} aria-live="polite">
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none',
                color,
              )}
              style={{ width: score >= step || (score === 0 && step === 1) ? '100%' : '0%' }}
            />
          </span>
        ))}
      </div>
      <p className="mt-1.5 type-caption text-muted-foreground">
        {t.auth.strength} <span className="font-semibold text-foreground">{t.auth.strengthLevels[score]}</span>
        {password.length < 8 && ` · ${format(t.auth.missingChars, { n: 8 - password.length })}`}
      </p>
    </div>
  )
}

/** Error del formulario: aparece con un leve temblor para llamar la atención. */
export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div
      key={message}
      role="alert"
      className="flex animate-shake items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 type-meta text-destructive motion-reduce:animate-none"
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  )
}
