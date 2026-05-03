import { useMemo, useState, type ReactNode } from 'react'
import { NotificationsContext, type NotificationItem, type NotificationsContextValue } from './use-notifications'

const initialNotifications: NotificationItem[] = [
  {
    id: 'stage-1-ready',
    title: 'Этап 1 активен',
    message: 'Подготовлен UI-каркас. API-интеграция подключается на следующих этапах.',
    level: 'info',
  },
]

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      removeNotification: (id: string) => {
        setNotifications((current) => current.filter((item) => item.id !== id))
      },
    }),
    [notifications],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
