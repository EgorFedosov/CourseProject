import { PageCard } from '../../../shared/ui/page-card'

export const UploadDocumentOverview = () => {
  return (
    <PageCard
      title="UploadPage"
      description="Точка входа для POST /api/v1/documents/upload через typed hook useUploadMutation."
    >
      <p>На следующем этапе здесь появится форма выбора файла и валидация формата PDF/DOCX.</p>
    </PageCard>
  )
}
