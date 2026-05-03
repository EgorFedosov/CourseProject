import { PageCard } from '../../../shared/ui/page-card'

export const UploadDocumentOverview = () => {
  return (
    <PageCard
      title="UploadPage"
      description="Точка входа для POST /api/v1/documents/upload. На этапе 1 страница готова для подключения формы загрузки."
    >
      <p>Далее здесь появится форма выбора файла и валидация формата PDF/DOCX.</p>
    </PageCard>
  )
}
