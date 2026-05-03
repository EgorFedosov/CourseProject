import { PageCard } from '../../../shared/ui/page-card'
import { AnalysisStatusTimeline } from '../../analysis-status/ui/analysis-status-timeline'

export const StartAnalysisOverview = () => {
  return (
    <PageCard
      title="AnalysisPage"
      description="Точки входа для POST /api/v1/analyses/start (useStartAnalysisMutation) и GET /api/v1/analyses/{check_id} (useAnalysisStatusQuery)."
    >
      <p>На следующем этапе здесь подключается запуск анализа и polling статуса.</p>
      <AnalysisStatusTimeline />
    </PageCard>
  )
}
