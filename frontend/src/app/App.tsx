import { NotificationsProvider } from './providers/notifications-provider'
import { QueryProvider } from './providers/query-client-provider'
import { AppRouter } from './router/app-router'

export const App = () => {
  return (
    <QueryProvider>
      <NotificationsProvider>
        <AppRouter />
      </NotificationsProvider>
    </QueryProvider>
  )
}
