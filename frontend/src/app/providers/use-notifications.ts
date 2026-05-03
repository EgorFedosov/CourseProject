import { createContext, useContext } from 'react'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotificationItem {
  id: string
  title: string
  message: string
  level: NotificationLevel
}

export interface NotificationsContextValue {
  notifications: NotificationItem[]
  removeNotification: (id: string) => void
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }

  return context
}
