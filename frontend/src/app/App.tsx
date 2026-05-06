import { NotificationsProvider } from './providers/notifications-provider'
import { QueryProvider } from './providers/query-client-provider'
import { TabsStateProvider } from './providers/tabs-state-provider'
import { AppRouter } from './router/app-router'

export const App = () => {
  return (
    <QueryProvider>
      <TabsStateProvider>
        <NotificationsProvider>
          <AppRouter />
        </NotificationsProvider>
      </TabsStateProvider>
    </QueryProvider>
  )
}

