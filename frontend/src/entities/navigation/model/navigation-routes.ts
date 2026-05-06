export interface NavigationRoute {
  path: string
  label: string
  hint: string
}

export const navigationRoutes: readonly NavigationRoute[] = [
  {
    path: '/upload',
    label: 'Загрузить',
    hint: 'Загрузка документа',
  },
  {
    path: '/analysis',
    label: 'Анализ',
    hint: 'Запуск проверки документа',
  },
  {
    path: '/report',
    label: 'Отчёт',
    hint: 'Результаты проверки',
  },
  {
    path: '/feedback',
    label: 'Правки',
    hint: 'Отправка правок преподавателя',
  },
  {
    path: '/rules',
    label: 'Правила',
    hint: 'Просмотр примененных требований',
  },
]
