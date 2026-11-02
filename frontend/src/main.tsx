import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n/I18nProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="capitalis-theme">
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <AuthProvider>
            <I18nProvider>
              <App />
            </I18nProvider>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
