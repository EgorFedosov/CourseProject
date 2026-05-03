import { PageCard } from '../../../shared/ui/page-card'

export const SubmitFeedbackOverview = () => {
  return (
    <PageCard
      title="FeedbackPage"
      description="Точка входа для POST /api/v1/feedback/corrections."
    >
      <p>На следующих этапах здесь появится форма отправки подтвержденных и отклоненных нарушений.</p>
    </PageCard>
  )
}
