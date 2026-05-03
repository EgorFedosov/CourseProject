import { NotificationsProvider } from './providers/notifications-provider'
import { AppRouter } from './router/app-router'

export const App = () => {
  return (
    <NotificationsProvider>
      <AppRouter />
    </NotificationsProvider>
  )
}
