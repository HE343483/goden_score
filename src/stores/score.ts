import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/* ── 类型定义 ── */

export interface JudgeScore {
  name: string
  score: number | null
}

export interface ProgramWithScore {
  id: number
  code: string
  name: string
  school: string
  majorCategory: string
  subCategory: string
  group: string
  teamType: string
  participantCount: number
  score: number | null
  status: number       // 0:未评分 1:已保存 2:已提交 -1:无需评分
  award: string
  judges: JudgeScore[]
}

/* ── Store ── */

export const useScoreStore = defineStore('score', () => {
  /* ── 状态 ── */
  const allPrograms = ref<ProgramWithScore[]>([])
  const keyword = ref('')
  const filterName = ref('')
  const filterStatus = ref<number | null>(null)
  const school = ref('')
  const editingScores = ref<Record<string, number>>({})
  const selectedCodes = ref<string[]>([])
  const loading = ref(false)

  /* ── 计算属性 ── */
  const filteredPrograms = computed(() => {
    let list = allPrograms.value
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      list = list.filter(d => d.code.toLowerCase().includes(kw) || d.name.toLowerCase().includes(kw))
    }
    if (filterName.value) {
      const kw = filterName.value.toLowerCase()
      list = list.filter(d => d.name.toLowerCase().includes(kw))
    }
    if (filterStatus.value !== null) {
      list = list.filter(d => d.status === filterStatus.value)
    }
    if (school.value) {
      list = list.filter(d => d.school.includes(school.value))
    }
    return list
  })

  /* ── 设置数据 ── */

  /** 接收 API 返回的数据并存入状态 */
  function setPrograms(data: ProgramWithScore[]) {
    allPrograms.value = data
    loading.value = false
  }

  /* ── 辅助方法 ── */
  function findIndex(code: string): number {
    return allPrograms.value.findIndex(d => d.code === code)
  }

  function updateStatus(code: string, status: number, score: number | null) {
    const idx = findIndex(code)
    if (idx === -1) return
    const item = { ...allPrograms.value[idx], status }
    if (score !== null) item.score = score
    allPrograms.value[idx] = item
  }

  /* ── 操作 ── */
  function submitScore(code: string, score: number) {
    updateStatus(code, 1, score)
    delete editingScores.value[code]
  }

  function markAbandoned(code: string) {
    updateStatus(code, -2, null)
  }

  function requestRescore(code: string) {
    updateStatus(code, 0, null)
  }

  function submitToFinal(code: string) {
    updateStatus(code, 2, allPrograms.value[findIndex(code)].score)
  }

  function markSameSchoolAvoid(code: string) {
    updateStatus(code, -3, null)
  }

  function resetJudgeScore(code: string, judgeName: string) {
    const idx = findIndex(code)
    if (idx === -1) return
    const item = allPrograms.value[idx]
    const judges = item.judges.map(j =>
      j.name === judgeName ? { ...j, score: null } : j
    )
    const validScores = judges.filter(j => j.score !== null).map(j => j.score!) as number[]
    const newScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null
    allPrograms.value[idx] = { ...item, judges, score: newScore, status: validScores.length > 0 ? 1 : 0 }
  }

  return {
    allPrograms,
    keyword,
    filterName,
    filterStatus,
    school,
    editingScores,
    selectedCodes,
    loading,
    filteredPrograms,
    setPrograms,
    submitScore,
    markAbandoned,
    requestRescore,
    submitToFinal,
    markSameSchoolAvoid,
    resetJudgeScore,
  }
})
