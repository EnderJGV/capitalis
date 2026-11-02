import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRightIcon, Loader2Icon, MailIcon } from 'lucide-react'
import { FormError, PasswordInput } from '@/components/app/AuthFields'
import { IconInput } from '@/components/app/IconInput'
import { Reveal } from '@/components/app/Reveal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/i18n/I18nProvider'

export default function Login() {
  const { user, login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.loginError)
      setBusy(false)
    }
  }

  return (
    <>
      <Reveal>
        <h1 className="type-title">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-muted-foreground">{t.auth.loginSubtitle}</p>
      </Reveal>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-5">
        <Reveal step={1} className="flex flex-col gap-2">
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
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Reveal>
        <Reveal step={2} className="flex flex-col gap-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <PasswordInput
            id="password"
            className="h-11"
            autoComplete="current-password"
            placeholder={t.auth.passwordPlaceholder}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Reveal>

        <FormError message={error} />

        <Reveal step={3}>
          <Button type="submit" className="group h-11 w-full text-base" disabled={busy}>
            {busy ? (
              <>
                <Loader2Icon className="animate-spin" />
                {t.auth.entering}
              </>
            ) : (
              <>
                {t.auth.signIn}
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </Reveal>
      </form>

      <Reveal step={4}>
        <p className="mt-6 text-center type-meta text-muted-foreground">
          {t.auth.firstTime}{' '}
          <Link to="/registro" replace className="font-semibold text-primary underline-offset-4 hover:underline">
            {t.auth.createFree}
          </Link>
        </p>
      </Reveal>
    </>
  )
}
