import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../shell/app-shell'
import { UploadPage } from '../../pages/upload/upload-page'
import { AnalysisPage } from '../../pages/analysis/analysis-page'
import { ReportPage } from '../../pages/report/report-page'
import { FeedbackPage } from '../../pages/feedback/feedback-page'
import { RulesViewPage } from '../../pages/rules/rules-view-page'
import { NotFoundPage } from '../../pages/not-found/not-found-page'

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="rules" element={<RulesViewPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
