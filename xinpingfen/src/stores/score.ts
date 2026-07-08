import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Program {
  code: string
  name: string
  majorCategory: string
  subCategory: string
  group: string
  teamType: string
}

export interface ProgramWithScore extends Program {
  status: number  /* 0=未评 1=已评 2=已提交 -2=弃赛 -3=同校回避 */
  score: number | null
}

export interface ScoreState {
  status: number
  score: number | null
}

/* 模拟参赛项目数据 */
const MOCK_PROGRAMS: Program[] = [
  { code: 'SCDYZ26B01XA', name: '声乐 / 合唱', majorCategory: '一、艺术表演类', subCategory: '声乐', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26B02XA', name: '声乐 / 小合唱或表演唱', majorCategory: '一、艺术表演类', subCategory: '声乐', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26B03XA', name: '舞蹈 / 群舞', majorCategory: '一、艺术表演类', subCategory: '舞蹈', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26C01XA', name: '器乐 / 合奏', majorCategory: '一、艺术表演类', subCategory: '器乐', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26D01XA', name: '绘画 / 国画', majorCategory: '二、艺术作品类', subCategory: '绘画', group: '甲组', teamType: '个人' },
  { code: 'SCDYZ26D02XA', name: '绘画 / 油画', majorCategory: '二、艺术作品类', subCategory: '绘画', group: '乙组', teamType: '个人' },
  { code: 'SCDYZ26E01XA', name: '书法 / 软笔', majorCategory: '二、艺术作品类', subCategory: '书法', group: '甲组', teamType: '个人' },
  { code: 'SCDYZ26F01XA', name: '朗诵 / 集体朗诵', majorCategory: '一、艺术表演类', subCategory: '朗诵', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26G01XA', name: '摄影 / 单幅', majorCategory: '二、艺术作品类', subCategory: '摄影', group: '甲组', teamType: '个人' },
  { code: 'SCDYZ26H01XA', name: '设计 / 平面设计', majorCategory: '二、艺术作品类', subCategory: '设计', group: '甲组', teamType: '个人' },
  { code: 'SCDYZ26B04XA', name: '声乐 / 独唱', majorCategory: '一、艺术表演类', subCategory: '声乐', group: '乙组', teamType: '个人' },
  { code: 'SCDYZ26C02XA', name: '器乐 / 小合奏或重奏', majorCategory: '一、艺术表演类', subCategory: '器乐', group: '甲组', teamType: '集体' },
  { code: 'SCDYZ26E02XA', name: '戏剧（戏曲）/ 个人剧目', majorCategory: '一、艺术表演类', subCategory: '戏剧（戏曲）', group: '乙组', teamType: '个人' },
  { code: 'SCDYZ26I01XA', name: '影视 / 纪录片', majorCategory: '二、艺术作品类', subCategory: '影视', group: '乙组', teamType: '集体' },
]

const STORAGE_KEY = 'expertScoreMap'

/* 从 localStorage 加载分数 */
function loadScoreMap(): Record<string, ScoreState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

/* 保存分数到 localStorage */
function saveScoreMap(map: Record<string, ScoreState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

/* 生成默认分数（首次使用时） */
function buildDefaultMap(): Record<string, ScoreState> {
  const saved = loadScoreMap()
  if (Object.keys(saved).length > 0) return saved
  const map: Record<string, ScoreState> = {}
  MOCK_PROGRAMS.forEach((_, i) => {
    let status = 0
    let score: number | null = null
    if (i === 0) { status = 2; score = 92.50 }
    else if (i === 1) { status = 2; score = 88.00 }
    else if (i === 2) { status = 1; score = 90.00 }
    else if (i === 3) { status = 1; score = 85.50 }
    else if (i === 6) { status = 1; score = 87.00 }
    else if (i === 8) { status = 2; score = 79.50 }
    else if (i === 10) { status = -2; score = null }
    else if (i === 11) { status = -3; score = null }
    else if (i === 12) { status = 1; score = 91.25 }
    map[MOCK_PROGRAMS[i].code] = { status, score }
  })
  saveScoreMap(map)
  return map
}

export const useScoreStore = defineStore('score', () => {
  const scoreMap = ref<Record<string, ScoreState>>(buildDefaultMap())
  const keyword = ref('')
  const filterStatus = ref<number | null>(null)
  const selectedCodes = ref<string[]>([])
  const editingScores = ref<Record<string, number>>({})

  /* 所有项目（合并分数状态） */
  const allPrograms = computed<ProgramWithScore[]>(() => {
    return MOCK_PROGRAMS.map(p => {
      const s = scoreMap.value[p.code] || { status: 0, score: null }
      return { ...p, ...s }
    })
  })

  /* 按关键词和状态筛选后的列表 */
  const filteredPrograms = computed<ProgramWithScore[]>(() => {
    let list = allPrograms.value
    if (keyword.value) {
      const kw = keyword.value
      list = list.filter(d => d.name.includes(kw) || d.code.includes(kw.toUpperCase()))
    }
    if (filterStatus.value !== null) {
      list = list.filter(d => d.status === filterStatus.value)
    }
    return list
  })

  /* 提交评分（未评 → 已评） */
  function submitScore(code: string, score: number) {
    scoreMap.value[code] = { status: 1, score }
    saveScoreMap(scoreMap.value)
  }

  /* 标记弃赛 */
  function markAbandoned(code: string) {
    scoreMap.value[code] = { status: -2, score: null }
    saveScoreMap(scoreMap.value)
  }

  /* 申请重评（已评 → 未评） */
  function requestRescore(code: string) {
    scoreMap.value[code] = { status: 0, score: null }
    saveScoreMap(scoreMap.value)
  }

  /* 提交至终审（已评 → 已提交） */
  function submitToFinal(code: string) {
    const s = scoreMap.value[code]
    if (s && (s.status === 1 || s.status === 0)) {
      s.status = 2
      saveScoreMap(scoreMap.value)
    }
  }

  /* 批量提交选中项目 */
  function batchSubmit() {
    selectedCodes.value.forEach(code => {
      const s = scoreMap.value[code]
      if (s && (s.status === 1 || s.status === 0)) {
        s.status = 2
      }
    })
    saveScoreMap(scoreMap.value)
    selectedCodes.value = []
  }

  return {
    scoreMap, keyword, filterStatus, selectedCodes, editingScores,
    allPrograms, filteredPrograms,
    submitScore, markAbandoned, requestRescore, submitToFinal, batchSubmit,
  }
})
