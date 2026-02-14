import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'

export const App = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
