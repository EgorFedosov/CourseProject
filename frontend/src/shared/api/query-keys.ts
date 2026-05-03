export const apiQueryKeys = {
  health: ['api', 'health'] as const,
  analysisStatus: (checkId: string) => ['api', 'analyses', checkId, 'status'] as const,
  report: (checkId: string) => ['api', 'reports', checkId] as const,
}
