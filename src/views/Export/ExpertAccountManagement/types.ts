/** 专家账号（来自 mapExpertApi 映射） */
export interface ExpertApi {
  id: number
  account: string
  name: string
  school: string
  schoolId: number | null
  status: string
  statusLabel: string
}
