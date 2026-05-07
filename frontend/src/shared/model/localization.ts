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
  'REQ-ABSTRACT-001': 'Обязателен раздел «Abstract»',
  'REQ-METHODOLOGY-001': 'Обязателен раздел «Methodology»',
  'REQ-RESULTS-001': 'Обязателен раздел «Results»',
  'REQ-REFERENCES-001': 'Обязателен раздел «References»',
  'REQ-LAB-INTRO-001': 'Lab report: обязателен раздел Introduction',
  'REQ-LAB-EQUIPMENT-001': 'Lab report: обязателен раздел Equipment and Setup',
  'REQ-LAB-RESULTS-001': 'Lab report: обязателен раздел Results',
  'REQ-LAB-CONCLUSION-001': 'Lab report: обязателен раздел Conclusion',
  'REQ-LAB-FONT-001': 'Lab report: требование к шрифту Helvetica 12',
  'REQ-CW-INTRO-001': 'Course work: обязателен раздел Introduction',
  'REQ-CW-ANALYSIS-001': 'Course work: обязателен раздел Analysis',
  'REQ-CW-CONCLUSION-001': 'Course work: обязателен раздел Conclusion',
  'REQ-CW-REFERENCES-001': 'Course work: обязателен раздел References',
  'REQ-CW-FONT-001': 'Course work: требование к шрифту Calibri 12',
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
