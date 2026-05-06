const documentTypeMap: Record<string, string> = {
  COURSE_PROJECT_NOTE: 'Пояснительная записка к курсовому проекту',
  COURSE_WORK_REPORT: 'Отчёт по курсовой работе',
  LAB_REPORT: 'Лабораторный отчёт',
}

const severityMap: Record<string, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
}

const categoryMap: Record<string, string> = {
  structure: 'Структура',
  formatting: 'Оформление',
  content: 'Содержание',
}

const ruleTitleMap: Record<string, string> = {
  'REQ-INTRO-001': 'Обязателен раздел «Введение»',
  'REQ-CONCLUSION-001': 'Обязателен раздел «Заключение»',
  'REQ-FONT-001': 'Требование к основному шрифту',
}

export const formatDocumentType = (value: string | null | undefined): string => {
  if (!value) {
    return 'Не определён'
  }
  return documentTypeMap[value] ?? value
}

export const formatSeverity = (value: string | null | undefined): string => {
  if (!value) {
    return 'Не указана'
  }
  const normalized = value.trim().toLowerCase()
  return severityMap[normalized] ?? value
}

export const formatCategory = (value: string | null | undefined): string => {
  if (!value) {
    return 'Не указана'
  }
  const normalized = value.trim().toLowerCase()
  return categoryMap[normalized] ?? value
}

export const formatRuleTitle = (ruleCode: string, title: string | null | undefined): string => {
  if (ruleTitleMap[ruleCode]) {
    return ruleTitleMap[ruleCode]
  }
  if (!title) {
    return 'Не указано'
  }
  return title
}

export const formatPipelineStatus = (status: string | null | undefined): string => {
  switch (status) {
    case 'NOT_UPLOADED':
      return 'Не загружен'
    case 'UPLOADED':
      return 'Загружен'
    case 'ANALYZING':
      return 'Идёт анализ'
    case 'TYPE_DETERMINED':
      return 'Тип определён'
    case 'SEMESTER_DETERMINED':
      return 'Семестр определён'
    case 'REQUIREMENTS_CHECKED':
      return 'Проверка требований завершена'
    case 'REPORT_READY':
      return 'Отчёт готов'
    case 'ERROR':
      return 'Ошибка'
    default:
      return status ?? 'Неизвестно'
  }
}
