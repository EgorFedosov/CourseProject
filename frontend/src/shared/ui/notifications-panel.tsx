import { useNotifications } from '../../app/providers/use-notifications'

const levelLabels: Record<string, string> = {
  info: 'Инфо',
  success: 'Успех',
  warning: 'Внимание',
  error: 'Ошибка',
}

export const NotificationsPanel = () => {
  const { notifications, removeNotification } = useNotifications()

  return (
    <section className="notifications-panel" aria-label="Глобальные уведомления">
      <h2>Уведомления</h2>
      {notifications.length === 0 ? <p className="notifications-empty">Новых уведомлений нет.</p> : null}
      <ul>
        {notifications.map((item) => (
          <li key={item.id} className={`notification notification--${item.level}`}>
            <div>
              <strong>{levelLabels[item.level]}</strong>
              <p>{item.title}</p>
              <small>{item.message}</small>
            </div>
            <button type="button" onClick={() => removeNotification(item.id)} aria-label={`Закрыть: ${item.title}`}>
              Закрыть
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
