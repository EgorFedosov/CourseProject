import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageCard } from '../../../shared/ui/page-card'

export const ReportViewOverview = () => {
  const [checkId, setCheckId] = useState('')
  const rulesRoute = checkId.trim().length > 0 ? `/rules?check_id=${encodeURIComponent(checkId.trim())}` : '/rules'

  return (
    <PageCard title="ReportPage" description="Точка входа для GET /api/v1/reports/{check_id} через typed hook useReportQuery.">
      <p>Здесь будет детальная визуализация отчета: тип, семестр, нарушения и рекомендации.</p>

      <section className="report-rules-navigation" aria-label="Навигация к правилам">
        <h2>Переход в Rules Inspector</h2>
        <label htmlFor="report-check-id-link">check_id для трассировки правил</label>
        <input
          id="report-check-id-link"
          type="text"
          value={checkId}
          onChange={(event) => setCheckId(event.target.value)}
          placeholder="Введите check_id (опционально)"
          autoComplete="off"
        />
        <Link to={rulesRoute}>Открыть RulesViewPage</Link>
      </section>
    </PageCard>
  )
}
