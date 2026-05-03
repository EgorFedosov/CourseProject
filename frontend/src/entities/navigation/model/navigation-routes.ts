export interface NavigationRoute {
  path: string
  label: string
  hint: string
}

export const navigationRoutes: readonly NavigationRoute[] = [
  {
    path: '/upload',
    label: 'Upload',
    hint: 'Загрузка документа',
  },
  {
    path: '/analysis',
    label: 'Analysis',
    hint: 'Запуск и статусы проверки',
  },
  {
    path: '/report',
    label: 'Report',
    hint: 'Результаты проверки',
  },
  {
    path: '/feedback',
    label: 'Feedback',
    hint: 'Правки преподавателя',
  },
  {
    path: '/rules',
    label: 'Rules',
    hint: 'Просмотр примененных требований',
  },
]
