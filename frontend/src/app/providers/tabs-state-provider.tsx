import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'

export interface UploadResultState {
  documentId: string
  filename: string
}

export interface UploadTabState {
  selectedFile: File | null
  errorMessage: string | null
  uploadResult: UploadResultState | null
  dragActive: boolean
}

export interface AnalysisTabState {
  documentId: string
  requestedBy: string
  activeCheckId: string | null
  startError: string | null
}

export interface ReportTabState {
  checkIdInput: string
  activeCheckId: string | null
}

export type ViolationDecisionMapState = Record<string, 'confirmed' | 'rejected'>

export interface FeedbackTabState {
  checkIdInput: string
  activeCheckId: string | null
  finalType: string
  finalSemester: string
  teacherComment: string
  violationDecisions: ViolationDecisionMapState
  formError: string | null
  submitResult: string | null
}

export interface RulesTabState {
  checkIdInput: string
  activeCheckId: string | null
}

interface TabsStateContextValue {
  upload: UploadTabState
  setUpload: Dispatch<SetStateAction<UploadTabState>>
  analysis: AnalysisTabState
  setAnalysis: Dispatch<SetStateAction<AnalysisTabState>>
  report: ReportTabState
  setReport: Dispatch<SetStateAction<ReportTabState>>
  feedback: FeedbackTabState
  setFeedback: Dispatch<SetStateAction<FeedbackTabState>>
  rules: RulesTabState
  setRules: Dispatch<SetStateAction<RulesTabState>>
  lastCheckId: string | null
  setLastCheckId: Dispatch<SetStateAction<string | null>>
  lastDocumentId: string | null
  setLastDocumentId: Dispatch<SetStateAction<string | null>>
}

const TabsStateContext = createContext<TabsStateContextValue | null>(null)

export const TabsStateProvider = ({ children }: { children: ReactNode }) => {
  const [upload, setUpload] = useState<UploadTabState>({
    selectedFile: null,
    errorMessage: null,
    uploadResult: null,
    dragActive: false,
  })

  const [analysis, setAnalysis] = useState<AnalysisTabState>({
    documentId: '',
    requestedBy: 'преподаватель',
    activeCheckId: null,
    startError: null,
  })

  const [report, setReport] = useState<ReportTabState>({
    checkIdInput: '',
    activeCheckId: null,
  })

  const [feedback, setFeedback] = useState<FeedbackTabState>({
    checkIdInput: '',
    activeCheckId: null,
    finalType: '',
    finalSemester: '',
    teacherComment: '',
    violationDecisions: {},
    formError: null,
    submitResult: null,
  })

  const [rules, setRules] = useState<RulesTabState>({
    checkIdInput: '',
    activeCheckId: null,
  })

  const [lastCheckId, setLastCheckId] = useState<string | null>(null)
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null)

  const value = useMemo<TabsStateContextValue>(
    () => ({
      upload,
      setUpload,
      analysis,
      setAnalysis,
      report,
      setReport,
      feedback,
      setFeedback,
      rules,
      setRules,
      lastCheckId,
      setLastCheckId,
      lastDocumentId,
      setLastDocumentId,
    }),
    [
      upload,
      analysis,
      report,
      feedback,
      rules,
      lastCheckId,
      lastDocumentId,
    ],
  )

  return <TabsStateContext.Provider value={value}>{children}</TabsStateContext.Provider>
}

export const useTabsState = (): TabsStateContextValue => {
  const context = useContext(TabsStateContext)
  if (!context) {
    throw new Error('useTabsState must be used within TabsStateProvider')
  }

  return context
}
