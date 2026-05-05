import { type FormEvent, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiClientError } from '../../../shared/api/error'
import { useReportQuery } from '../../../shared/api/hooks/use-report-query'
import { useSubmitFeedbackMutation } from '../../../shared/api/hooks/use-submit-feedback-mutation'
import { PageCard } from '../../../shared/ui/page-card'
import { buildFeedbackPayload, getUniqueViolationCodes, type ViolationDecisionMap } from '../model/corrections-form'

const resolveCheckId = (searchParams: URLSearchParams): string => {
  return searchParams.get('check_id')?.trim() ?? ''
}

const formatError = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof ApiClientError) {
    if (error.traceId) {
      return `${error.message} (trace_id: ${error.traceId})`
    }

    return error.message
  }

  return fallbackMessage
}

export const SubmitFeedbackOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [checkIdInput, setCheckIdInput] = useState(() => resolveCheckId(searchParams))
  const [activeCheckId, setActiveCheckId] = useState<string | null>(() => {
    const initialCheckId = resolveCheckId(searchParams)
    return initialCheckId.length > 0 ? initialCheckId : null
  })

  const reportQuery = useReportQuery(activeCheckId)
  const submitMutation = useSubmitFeedbackMutation()

  const [finalType, setFinalType] = useState('')
  const [finalSemester, setFinalSemester] = useState('')
  const [teacherComment, setTeacherComment] = useState('')
  const [violationDecisions, setViolationDecisions] = useState<ViolationDecisionMap>({})

  const [formError, setFormError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<string | null>(null)

  const resolvedFinalType = finalType.trim().length > 0 ? finalType : (reportQuery.data?.determined_type ?? '')
  const resolvedFinalSemester =
    finalSemester.trim().length > 0
      ? finalSemester
      : (typeof reportQuery.data?.determined_semester === 'number' ? String(reportQuery.data.determined_semester) : '')

  const handleLoadReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCheckId = checkIdInput.trim()
    if (normalizedCheckId.length === 0) {
      setFormError('Укажите check_id для загрузки отчёта.')
      return
    }

    setFormError(null)
    setSubmitResult(null)

    if (normalizedCheckId !== activeCheckId) {
      setFinalType('')
      setFinalSemester('')
      setTeacherComment('')
      setViolationDecisions({})
    }

    setActiveCheckId(normalizedCheckId)
    setSearchParams({ check_id: normalizedCheckId })
  }

  const handleSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitMutation.isPending) {
      return
    }

    setFormError(null)
    setSubmitResult(null)

    const payloadResult = buildFeedbackPayload(
      {
        checkId: activeCheckId ?? '',
        finalType: resolvedFinalType,
        finalSemester: resolvedFinalSemester,
        teacherComment,
      },
      reportQuery.data,
      violationDecisions,
    )

    if (!payloadResult.success || !payloadResult.payload) {
      setFormError(payloadResult.message ?? 'Форма не прошла валидацию.')
      return
    }

    try {
      const response = await submitMutation.mutateAsync(payloadResult.payload)
      const details = [response.status]

      if (response.message) {
        details.push(response.message)
      }

      if (response.case_id) {
        details.push(`case_id: ${response.case_id}`)
      }

      setSubmitResult(`Правки отправлены: ${details.join(' · ')}`)
    } catch (error) {
      setFormError(formatError(error, 'Не удалось отправить правки.'))
    }
  }

  const violationCodes = getUniqueViolationCodes(reportQuery.data)

  return (
    <PageCard
      title="FeedbackPage"
      description="Форма отправки teacher-corrections: загрузка violations по GET /api/v1/reports/{check_id} и отправка POST /api/v1/feedback/corrections."
    >
      <form className="feedback-check-id-form" onSubmit={handleLoadReport}>
        <label htmlFor="feedback-check-id">check_id</label>
        <div className="feedback-check-id-form__controls">
          <input
            id="feedback-check-id"
            name="check_id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setCheckIdInput(event.target.value)}
            placeholder="Введите check_id из этапа анализа"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Загрузить отчёт'}
          </button>
        </div>
      </form>

      {reportQuery.error ? <p className="feedback-error">{formatError(reportQuery.error, 'Не удалось получить отчёт.')}</p> : null}

      <form className="feedback-form" onSubmit={handleSubmitFeedback}>
        <fieldset disabled={!reportQuery.data || reportQuery.isFetching}>
          <legend>Правки преподавателя</legend>

          <div className="feedback-form__grid">
            <label htmlFor="feedback-final-type">
              final_type
              <input
                id="feedback-final-type"
                name="final_type"
                type="text"
                value={resolvedFinalType}
                onChange={(event) => setFinalType(event.target.value)}
                placeholder="Например: LAB_REPORT"
              />
            </label>

            <label htmlFor="feedback-final-semester">
              final_semester
              <input
                id="feedback-final-semester"
                name="final_semester"
                type="number"
                min={1}
                step={1}
                value={resolvedFinalSemester}
                onChange={(event) => setFinalSemester(event.target.value)}
                placeholder="Например: 4"
              />
            </label>
          </div>

          <section className="feedback-violations" aria-label="Уточнение нарушений">
            <h2>Нарушения из отчёта</h2>
            {violationCodes.length === 0 ? (
              <p>В отчёте нет нарушений. Можно отправить только уточнение типа/семестра и комментарий.</p>
            ) : (
              <ul>
                {violationCodes.map((code) => {
                  const example = reportQuery.data?.violations.find((item) => item.code === code)
                  const decision = violationDecisions[code] ?? 'confirmed'

                  return (
                    <li key={code} className="feedback-violation-item">
                      <div>
                        <strong>{code}</strong>
                        {example?.message ? <p>{example.message}</p> : null}
                        {example?.severity || example?.category ? (
                          <small>
                            {example.severity ? `severity: ${example.severity}` : 'severity: n/a'} ·{' '}
                            {example.category ? `category: ${example.category}` : 'category: n/a'}
                          </small>
                        ) : null}
                      </div>
                      <div className="feedback-violation-actions">
                        <label>
                          <input
                            type="radio"
                            name={`violation-${code}`}
                            value="confirmed"
                            checked={decision === 'confirmed'}
                            onChange={() =>
                              setViolationDecisions((current) => ({
                                ...current,
                                [code]: 'confirmed',
                              }))
                            }
                          />
                          Подтвердить
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`violation-${code}`}
                            value="rejected"
                            checked={decision === 'rejected'}
                            onChange={() =>
                              setViolationDecisions((current) => ({
                                ...current,
                                [code]: 'rejected',
                              }))
                            }
                          />
                          Отклонить
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <label htmlFor="feedback-teacher-comment">
            teacher_comment
            <textarea
              id="feedback-teacher-comment"
              name="teacher_comment"
              value={teacherComment}
              onChange={(event) => setTeacherComment(event.target.value)}
              rows={4}
              placeholder="Комментарий преподавателя"
            />
          </label>

          <div className="feedback-actions">
            <button type="submit" disabled={submitMutation.isPending || !reportQuery.data}>
              {submitMutation.isPending ? 'Отправка...' : 'Отправить правки'}
            </button>
          </div>
        </fieldset>
      </form>

      {formError ? <p className="feedback-error">{formError}</p> : null}
      {submitResult ? <p className="feedback-success">{submitResult}</p> : null}
    </PageCard>
  )
}
