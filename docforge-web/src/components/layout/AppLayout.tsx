import { NavLink, Outlet } from 'react-router-dom'

import { useSettings } from '@/features/settings/settings-context'
import { useI18n } from '@/shared/i18n/use-i18n'
import { cn } from '@/shared/lib/utils'

export const AppLayout = () => {
  const { apiKey, baseUrl } = useSettings()
  const { t } = useI18n()

  const navItems = [
    { to: '/groups', label: t('nav.groups') },
    { to: '/ingestion', label: t('nav.ingestion') },
    { to: '/search', label: t('nav.search') },
    { to: '/chat', label: t('nav.chat') },
    { to: '/draft', label: t('nav.draft') },
    { to: '/tags', label: t('nav.tags') },
    { to: '/settings', label: t('nav.settings') },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('app.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('app.subtitle')}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8">
        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('app.api')}</p>
            <p className="mt-1 truncate text-sm">{baseUrl}</p>
            <p className="text-xs text-muted-foreground">
              Key: {apiKey ? `${apiKey.slice(0, 5)}***` : t('app.keyNotConfigured')}
            </p>
          </div>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="space-y-6">
          {!apiKey && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              {t('app.missingKey')}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
