import { useMemo, useState, type ReactNode } from 'react'
import { NotificationsContext, type NotificationItem, type NotificationsContextValue } from './use-notifications'

const initialNotifications: NotificationItem[] = []

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
