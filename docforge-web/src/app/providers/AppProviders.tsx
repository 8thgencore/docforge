import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { type PropsWithChildren, useState } from 'react'
import { Toaster } from 'sonner'

import { SettingsProvider } from '@/features/settings/settings-context'
import { storageKeys } from '@/shared/config/storage'

export const AppProviders = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={storageKeys.theme}>
      <SettingsProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
