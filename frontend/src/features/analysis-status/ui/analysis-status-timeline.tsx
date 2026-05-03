import { pipelineStatuses } from '../model/pipeline-statuses'

export const AnalysisStatusTimeline = () => {
  return (
    <ol className="status-timeline">
      {pipelineStatuses.map((status) => (
        <li key={status}>
          <span>{status}</span>
        </li>
      ))}
    </ol>
  )
}
