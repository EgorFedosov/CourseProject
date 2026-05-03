import { PageCard } from '../../../shared/ui/page-card'

export const ReportViewOverview = () => {
  return (
    <PageCard
      title="ReportPage"
      description="Точка входа для GET /api/v1/reports/{check_id}."
    >
      <p>Здесь будет детальная визуализация отчета: тип, семестр, нарушения и рекомендации.</p>
    </PageCard>
  )
}
