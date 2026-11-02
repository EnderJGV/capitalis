import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRightIcon, Loader2Icon, MailIcon, UserIcon } from 'lucide-react'
import { FormError, PasswordInput, PasswordStrength } from '@/components/app/AuthFields'
import { CurrencyPicker } from '@/components/app/CurrencyPicker'
import { IconInput } from '@/components/app/IconInput'
import { Reveal } from '@/components/app/Reveal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import type { Currency } from '@/domain/types'
import { useI18n } from '@/i18n/I18nProvider'

export default function Register() {
  const { user, register } = useAuth()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError(t.auth.passwordTooShort)
      return
    }
    setError('')
    setBusy(true)
    try {
      await register({ name: name.trim(), email, password, currency, language: lang })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.registerError)
      setBusy(false)
    }
  }

  return (
    <>
      <Reveal>
        <h1 className="type-title">{t.auth.registerTitle}</h1>
        <p className="mt-1 text-muted-foreground">{t.auth.registerSubtitle}</p>
      </Reveal>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-5">
        <Reveal step={1} className="flex flex-col gap-2">
          <Label htmlFor="name">{t.auth.name}</Label>
          <IconInput
            icon={UserIcon}
            id="name"
            className="h-11"
            autoComplete="name"
            placeholder={t.auth.namePlaceholder}
            required
            autoFocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Reveal>
        <Reveal step={2} className="flex flex-col gap-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <IconInput
            icon={MailIcon}
            id="email"
            type="email"
            inputMode="email"
            className="h-11"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Reveal>
        <Reveal step={3} className="flex flex-col gap-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <PasswordInput
            id="password"
            className="h-11"
            autoComplete="new-password"
            placeholder={t.auth.newPasswordPlaceholder}
            required
            minLength={8}
            maxLength={72}
            aria-describedby="password-strength"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrength id="password-strength" password={password} />
        </Reveal>
        <Reveal step={4} className="flex flex-col gap-2">
          <Label htmlFor="currency">{t.auth.mainCurrency}</Label>
          <CurrencyPicker id="currency" value={currency} onChange={setCurrency} />
        </Reveal>

        <FormError message={error} />

        <Reveal step={5}>
          <Button type="submit" className="group h-11 w-full text-base" disabled={busy}>
            {busy ? (
              <>
                <Loader2Icon className="animate-spin" />
                {t.auth.creating}
              </>
            ) : (
              <>
                {t.auth.signUp}
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </Reveal>
      </form>

      <Reveal step={6}>
        <p className="mt-6 text-center type-meta text-muted-foreground">
          {t.auth.haveAccount}{' '}
          <Link to="/login" replace className="font-semibold text-primary underline-offset-4 hover:underline">
            {t.auth.signInLink}
          </Link>
        </p>
      </Reveal>
    </>
  )
}
