import { type FormEvent, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTabsState } from '../../../app/providers/tabs-state-provider'
import { toUserFacingMessage } from '../../../shared/api/error'
import { useReportQuery } from '../../../shared/api/hooks/use-report-query'
import { useSubmitFeedbackMutation } from '../../../shared/api/hooks/use-submit-feedback-mutation'
import { formatCategory, formatSeverity } from '../../../shared/model/localization'
import { PageCard } from '../../../shared/ui/page-card'
import { StatePanel } from '../../../shared/ui/state-panel'
import { buildFeedbackPayload, getUniqueViolationCodes, type ViolationDecisionMap } from '../model/corrections-form'

const resolveCheckId = (searchParams: URLSearchParams): string => {
  return searchParams.get('check_id')?.trim() ?? ''
}

const formatError = (error: unknown, fallbackMessage: string): string => {
  return toUserFacingMessage(error, fallbackMessage)
}

export const SubmitFeedbackOverview = () => {
  const documentTypeOptions = [
    { value: 'COURSE_PROJECT_NOTE', label: 'Пояснительная записка к курсовому проекту' },
    { value: 'COURSE_WORK_REPORT', label: 'Отчёт по курсовой работе' },
    { value: 'LAB_REPORT', label: 'Лабораторный отчёт' },
  ]

  const [searchParams, setSearchParams] = useSearchParams()
  const {
    feedback,
    setFeedback,
    lastCheckId,
    setLastCheckId,
  } = useTabsState()

  const {
    checkIdInput,
    activeCheckId,
    finalType,
    finalSemester,
    teacherComment,
    violationDecisions,
    formError,
    submitResult,
  } = feedback

  const reportQuery = useReportQuery(activeCheckId)
  const submitMutation = useSubmitFeedbackMutation()

  useEffect(() => {
    const restoredCheckId = resolveCheckId(searchParams)

    setFeedback((current) => {
      let changed = false
      let next = current

      if (current.checkIdInput.trim().length === 0) {
        const fallbackInput = restoredCheckId || lastCheckId || ''
        if (fallbackInput.length > 0) {
          next = { ...next, checkIdInput: fallbackInput }
          changed = true
        }
      }

      if (!current.activeCheckId) {
        const fallbackCheckId = restoredCheckId || lastCheckId
        if (fallbackCheckId) {
          next = { ...next, activeCheckId: fallbackCheckId }
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [lastCheckId, searchParams, setFeedback])

  const resolvedFinalType = finalType.trim().length > 0 ? finalType : (reportQuery.data?.determined_type ?? '')
  const hasKnownDocumentType = documentTypeOptions.some((option) => option.value === resolvedFinalType)
  const selectedDocumentType = hasKnownDocumentType ? resolvedFinalType : ''
  const resolvedFinalSemester =
    finalSemester.trim().length > 0
      ? finalSemester
      : (typeof reportQuery.data?.determined_semester === 'number' ? String(reportQuery.data.determined_semester) : '')

  const handleLoadReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedCheckId = checkIdInput.trim()
    if (normalizedCheckId.length === 0) {
      setFeedback((current) => ({
        ...current,
        formError: 'Укажите идентификатор проверки для загрузки отчёта.',
      }))
      return
    }

    setFeedback((current) => {
      const shouldResetForm = normalizedCheckId !== current.activeCheckId

      return {
        ...current,
        formError: null,
        submitResult: null,
        activeCheckId: normalizedCheckId,
        checkIdInput: normalizedCheckId,
        finalType: shouldResetForm ? '' : current.finalType,
        finalSemester: shouldResetForm ? '' : current.finalSemester,
        teacherComment: shouldResetForm ? '' : current.teacherComment,
        violationDecisions: shouldResetForm ? {} : current.violationDecisions,
      }
    })

    setLastCheckId(normalizedCheckId)
    setSearchParams({ check_id: normalizedCheckId })
  }

  const handleSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitMutation.isPending) {
      return
    }

    setFeedback((current) => ({
      ...current,
      formError: null,
      submitResult: null,
    }))

    const payloadResult = buildFeedbackPayload(
      {
        checkId: activeCheckId ?? '',
        finalType: resolvedFinalType,
        finalSemester: resolvedFinalSemester,
        teacherComment,
      },
      reportQuery.data,
      violationDecisions as ViolationDecisionMap,
    )

    if (!payloadResult.success || !payloadResult.payload) {
      setFeedback((current) => ({
        ...current,
        formError: payloadResult.message ?? 'Форма не прошла валидацию.',
      }))
      return
    }

    try {
      await submitMutation.mutateAsync(payloadResult.payload)

      setFeedback((current) => ({
        ...current,
        submitResult: 'Правки успешно отправлены и сохранены.',
      }))
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        formError: formatError(error, 'Не удалось отправить правки.'),
      }))
    }
  }

  const violationCodes = getUniqueViolationCodes(reportQuery.data)

  return (
    <PageCard 
      title="Проверка и корректировка результата" 
      description="Интерфейс для преподавателя. Вы можете подтвердить или исправить результаты анализа документа."
    >
      {/* UX-only change: improved feedback form layout with teacher-focused design */}
      <form className="feedback-check-id-form" onSubmit={handleLoadReport}>
        <label htmlFor="feedback-check-id">Идентификатор проверки</label>
        <div className="feedback-check-id-form__controls">
          <input
            id="feedback-check-id"
            name="check_id"
            type="text"
            value={checkIdInput}
            onChange={(event) => setFeedback((current) => ({ ...current, checkIdInput: event.target.value }))}
            placeholder="Введите идентификатор проверки"
            autoComplete="off"
          />
          <button type="submit" disabled={reportQuery.isFetching}>
            {reportQuery.isFetching ? 'Загрузка...' : 'Загрузить отчёт'}
          </button>
        </div>
      </form>

      {!activeCheckId && !reportQuery.isFetching ? (
        <StatePanel tone="empty" title="Укажите идентификатор проверки" message="Введите идентификатор проверки, чтобы начать проверку и корректировку результатов." />
      ) : null}

      {reportQuery.isFetching ? <StatePanel tone="loading" title="Загрузка отчёта" message="Получаем данные для проверки..." /> : null}

      {reportQuery.error ? (
        <StatePanel
          tone="error"
          title="Ошибка получения отчёта"
          message={formatError(reportQuery.error, 'Не удалось получить отчёт.')}
          actionLabel="Повторить запрос"
          onAction={() => {
            void reportQuery.refetch()
          }}
        />
      ) : null}

      {reportQuery.data ? (
        <form className="feedback-form" onSubmit={handleSubmitFeedback}>
          {/* UX-only change: better visual hierarchy and grouping */}
          <fieldset disabled={!reportQuery.data || reportQuery.isFetching}>
            <legend>Корректировка параметров анализа</legend>

            {/* Document classification section */}
            <section className="feedback-form__section">
              <h3>Классификация документа</h3>
              <div className="feedback-form__grid">
                <label htmlFor="feedback-final-type" className="feedback-form__label">
                  <span className="feedback-form__label-text">Тип документа</span>
                  <select
                    id="feedback-final-type"
                    name="final_type"
                    value={selectedDocumentType}
                    onChange={(event) => setFeedback((current) => ({ ...current, finalType: event.target.value }))}
                    className="feedback-form__input"
                  >
                    <option value="">Выберите тип документа</option>
                    {documentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="feedback-final-semester" className="feedback-form__label">
                  <span className="feedback-form__label-text">Семестр</span>
                  <input
                    id="feedback-final-semester"
                    name="final_semester"
                    type="number"
                    min={1}
                    step={1}
                    value={resolvedFinalSemester}
                    onChange={(event) => setFeedback((current) => ({ ...current, finalSemester: event.target.value }))}
                    placeholder="Например: 4"
                    className="feedback-form__input"
                  />
                </label>
              </div>
            </section>

            {/* Violations review section */}
            <section className="feedback-form__section feedback-violations" aria-label="Проверка нарушений">
              <h3>Проверка и подтверждение нарушений</h3>
              {violationCodes.length === 0 ? (
                <StatePanel
                  tone="empty"
                  title="Нарушений не обнаружено"
                  message="Анализ не выявил нарушений. Вы можете скорректировать классификацию документа и добавить комментарий."
                />
              ) : (
                <div className="feedback-violations__list">
                  {violationCodes.map((code) => {
                    const example = reportQuery.data?.violations.find((item) => item.code === code)
                    const decision = violationDecisions[code] ?? 'confirmed'

                    return (
                      <div key={code} className="feedback-violation-item">
                        <div className="feedback-violation-item__header">
                          <div className="feedback-violation-item__info">
                            <strong className="feedback-violation-item__code">{code}</strong>
                            {example?.message ? <p className="feedback-violation-item__message">{example.message}</p> : null}
                            {example?.severity || example?.category ? (
                              <small className="feedback-violation-item__meta">
                                {example.severity ? `Серьёзность: ${formatSeverity(example.severity)}` : null}
                                {example.severity && example.category ? ' • ' : ''}
                                {example.category ? `Категория: ${formatCategory(example.category)}` : null}
                              </small>
                            ) : null}
                          </div>
                        </div>
                        <div className="feedback-violation-item__actions">
                          <label className="feedback-violation-action">
                            <input
                              type="radio"
                              name={`violation-${code}`}
                              value="confirmed"
                              checked={decision === 'confirmed'}
                              onChange={() =>
                                setFeedback((current) => ({
                                  ...current,
                                  violationDecisions: {
                                    ...current.violationDecisions,
                                    [code]: 'confirmed',
                                  },
                                }))
                              }
                            />
                            <span>Подтвердить</span>
                          </label>
                          <label className="feedback-violation-action">
                            <input
                              type="radio"
                              name={`violation-${code}`}
                              value="rejected"
                              checked={decision === 'rejected'}
                              onChange={() =>
                                setFeedback((current) => ({
                                  ...current,
                                  violationDecisions: {
                                    ...current.violationDecisions,
                                    [code]: 'rejected',
                                  },
                                }))
                              }
                            />
                            <span>Отклонить</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Teacher notes section */}
            <section className="feedback-form__section">
              <h3>Комментарий преподавателя</h3>
              <label htmlFor="feedback-teacher-comment" className="feedback-form__label">
                <span className="feedback-form__label-text">Дополнительные замечания (опционально)</span>
                <textarea
                  id="feedback-teacher-comment"
                  name="teacher_comment"
                  value={teacherComment}
                  onChange={(event) => setFeedback((current) => ({ ...current, teacherComment: event.target.value }))}
                  rows={4}
                  placeholder="Введите ваши замечания и рекомендации..."
                  className="feedback-form__textarea"
                />
              </label>
            </section>

            {/* Submit button */}
            <div className="feedback-actions">
              <button type="submit" disabled={submitMutation.isPending || !reportQuery.data} className="feedback-actions__submit">
                {submitMutation.isPending ? 'Отправка правок...' : 'Отправить правки'}
              </button>
            </div>
          </fieldset>
        </form>
      ) : null}

      {submitMutation.isPending ? <StatePanel tone="loading" title="Отправка правок" message="Сохраняем правки на сервере..." /> : null}

      {formError ? <StatePanel tone="error" title="Ошибка при отправке" message={formError} /> : null}
      {submitResult ? <StatePanel tone="success" title="Правки успешно отправлены" message={submitResult} /> : null}
    </PageCard>
  )
}

