import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Program {
  code: string
  name: string
  group: string
  teamType: string
  school: string
}

export interface ProgramWithScore extends Program {
  status: number  /* 0=未评 1=已评 2=已提交 -2=弃赛 -3=同校回避 */
  score: number | null
  award: string | null
  majorCategory: string
  subCategory: string
  participantCount: number
  judges: { name: string; score: number | null }[]
}

export interface ScoreState {
  status: number
  score: number | null
  award: string | null
}

/* 模拟参赛项目数据 */
const MOCK_PROGRAMS: Program[] = [
  { code: 'SCDYZ26B01XA', name: '声乐 / 合唱',          group: '甲组', teamType: '集体', school: '四川大学' },
  { code: 'SCDYZ26B02XA', name: '声乐 / 小合唱或表演唱', group: '甲组', teamType: '集体', school: '四川师范大学' },
  { code: 'SCDYZ26B03XA', name: '舞蹈 / 群舞',          group: '甲组', teamType: '集体', school: '西南民族大学' },
  { code: 'SCDYZ26C01XA', name: '器乐 / 合奏',          group: '甲组', teamType: '集体', school: '四川音乐学院' },
  { code: 'SCDYZ26C02XA', name: '戏剧 / 话剧',          group: '乙组', teamType: '集体', school: '西南交通大学' },
  { code: 'SCDYZ26F01XA', name: '朗诵 / 集体朗诵',       group: '甲组', teamType: '集体', school: '电子科技大学' },
  { code: 'SCDYZ26B04XA', name: '声乐 / 独唱',          group: '乙组', teamType: '个人', school: '四川大学' },
  { code: 'SCDYZ26C04XA', name: '器乐 / 钢琴独奏',       group: '甲组', teamType: '个人', school: '成都大学' },
  { code: 'SCDYZ26B05XA', name: '舞蹈 / 独舞',          group: '乙组', teamType: '个人', school: '西华大学' },
  { code: 'SCDYZ26C05XA', name: '戏曲 / 川剧',          group: '乙组', teamType: '个人', school: '四川师范大学' },
  { code: 'SCDYZ26F02XA', name: '朗诵 / 个人朗诵',       group: '甲组', teamType: '个人', school: '西南财经大学' },
  { code: 'SCDYZ26D01XA', name: '绘画 / 国画',          group: '甲组', teamType: '个人', school: '四川美术学院' },
  { code: 'SCDYZ26D02XA', name: '绘画 / 油画',          group: '乙组', teamType: '个人', school: '四川大学' },
  { code: 'SCDYZ26E01XA', name: '书法 / 软笔',          group: '甲组', teamType: '个人', school: '四川师范大学' },
  { code: 'SCDYZ26E02XA', name: '书法 / 硬笔',          group: '乙组', teamType: '个人', school: '成都理工大学' },
  { code: 'SCDYZ26E03XA', name: '篆刻 / 印章',          group: '甲组', teamType: '个人', school: '西南民族大学' },
  { code: 'SCDYZ26G01XA', name: '摄影 / 风光',          group: '甲组', teamType: '个人', school: '四川传媒学院' },
  { code: 'SCDYZ26H01XA', name: '设计 / 海报',          group: '甲组', teamType: '个人', school: '四川大学' },
  { code: 'SCDYZ26H02XA', name: '影视 / 微电影',         group: '乙组', teamType: '集体', school: '四川电影电视学院' },
  { code: 'SCDYZ26I01XA', name: '绘画 / 山水',          group: '—', teamType: '个人', school: '四川大学' },
  { code: 'SCDYZ26I02XA', name: '书法 / 行书',          group: '—', teamType: '个人', school: '电子科技大学' },
  { code: 'SCDYZ26I03XA', name: '篆刻 / 古印',          group: '—', teamType: '个人', school: '西南交通大学' },
  { code: 'SCDYZ26J01XA', name: '扎染艺术工作坊',        group: '—', teamType: '集体', school: '西南民族大学' },
  { code: 'SCDYZ26J02XA', name: '陶艺工作坊',            group: '—', teamType: '集体', school: '四川美术学院' },
  { code: 'SCDYZ26K01XA', name: '美育改革创新案例',       group: '—', teamType: '—', school: '四川师范大学' },
]

/* 模拟评委打分数据 */
const MOCK_JUDGE_DATA: Record<string, { count: number; judges: { name: string; score: number | null }[] }> = {
  'SCDYZ26B01XA': { count: 40, judges: [{ name: '张教授', score: 93 }, { name: '李教授', score: 92 }, { name: '王教授', score: null }] },
  'SCDYZ26B02XA': { count: 24, judges: [{ name: '张教授', score: 89 }, { name: '李教授', score: 87 }] },
  'SCDYZ26B03XA': { count: 30, judges: [{ name: '王教授', score: 91 }, { name: '赵教授', score: 89 }, { name: '刘教授', score: 90 }] },
  'SCDYZ26C01XA': { count: 60, judges: [{ name: '李教授', score: 92 }, { name: '王教授', score: 90 }] },
  'SCDYZ26C02XA': { count: 15, judges: [{ name: '张教授', score: 86 }, { name: '赵教授', score: 85 }, { name: '刘教授', score: null }] },
  'SCDYZ26F01XA': { count: 8, judges: [{ name: '王教授', score: 86 }, { name: '李教授', score: 85 }] },
  'SCDYZ26B04XA': { count: 1, judges: [{ name: '张教授', score: 83 }] },
  'SCDYZ26C04XA': { count: 1, judges: [{ name: '赵教授', score: 88 }, { name: '李教授', score: 87 }] },
  'SCDYZ26B05XA': { count: 1, judges: [{ name: '刘教授', score: 84 }] },
  'SCDYZ26C05XA': { count: 1, judges: [] },
  'SCDYZ26F02XA': { count: 1, judges: [{ name: '张教授', score: null }] },
  'SCDYZ26D01XA': { count: 1, judges: [{ name: '王教授', score: 90 }, { name: '赵教授', score: 91 }, { name: '李教授', score: 89 }] },
  'SCDYZ26D02XA': { count: 1, judges: [{ name: '刘教授', score: 85 }] },
  'SCDYZ26E01XA': { count: 1, judges: [{ name: '张教授', score: 87 }, { name: '王教授', score: 86 }] },
  'SCDYZ26E02XA': { count: 1, judges: [{ name: '赵教授', score: 83 }] },
  'SCDYZ26E03XA': { count: 1, judges: [] },
  'SCDYZ26G01XA': { count: 1, judges: [{ name: '李教授', score: 88 }] },
  'SCDYZ26H01XA': { count: 1, judges: [{ name: '王教授', score: null }] },
  'SCDYZ26H02XA': { count: 12, judges: [{ name: '张教授', score: 86 }, { name: '赵教授', score: null }] },
  'SCDYZ26I01XA': { count: 1, judges: [{ name: '刘教授', score: 91 }] },
  'SCDYZ26I02XA': { count: 1, judges: [{ name: '王教授', score: null }] },
  'SCDYZ26I03XA': { count: 1, judges: [] },
  'SCDYZ26J01XA': { count: 10, judges: [{ name: '张教授', score: 89 }, { name: '李教授', score: 90 }, { name: '王教授', score: 88 }] },
  'SCDYZ26J02XA': { count: 8, judges: [{ name: '赵教授', score: null }] },
  'SCDYZ26K01XA': { count: 3, judges: [{ name: '刘教授', score: null }, { name: '张教授', score: null }] },
}

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

  /* 已提交（有奖项） */
  map['SCDYZ26B01XA'] = { status: 2, score: 92.50, award: '一等奖' }
  map['SCDYZ26B02XA'] = { status: 2, score: 88.00, award: '二等奖' }
  map['SCDYZ26C01XA'] = { status: 2, score: 91.00, award: '一等奖' }
  map['SCDYZ26F01XA'] = { status: 2, score: 85.50, award: '三等奖' }
  map['SCDYZ26D01XA'] = { status: 2, score: 90.00, award: '二等奖' }
  map['SCDYZ26E02XA'] = { status: 2, score: 82.50, award: '三等奖' }
  map['SCDYZ26I01XA'] = { status: 2, score: 91.25, award: '一等奖' }

  /* 已评分（待提交） */
  map['SCDYZ26B03XA'] = { status: 1, score: 90.00, award: null }
  map['SCDYZ26C02XA'] = { status: 1, score: 85.50, award: null }
  map['SCDYZ26B04XA'] = { status: 1, score: 83.00, award: null }
  map['SCDYZ26C04XA'] = { status: 1, score: 87.50, award: null }
  map['SCDYZ26B05XA'] = { status: 1, score: 84.00, award: null }
  map['SCDYZ26D02XA'] = { status: 1, score: 85.00, award: null }
  map['SCDYZ26E01XA'] = { status: 1, score: 86.50, award: null }
  map['SCDYZ26G01XA'] = { status: 1, score: 88.00, award: null }
  map['SCDYZ26H02XA'] = { status: 1, score: 86.00, award: null }
  map['SCDYZ26J01XA'] = { status: 1, score: 89.00, award: null }

  /* 弃赛 / 回避 */
  map['SCDYZ26C05XA'] = { status: -2, score: null, award: null }
  map['SCDYZ26E03XA'] = { status: -3, score: null, award: null }

  /* 其余均为未评分 */
  map['SCDYZ26F02XA'] = { status: 0, score: null, award: null }
  map['SCDYZ26H01XA'] = { status: 0, score: null, award: null }
  map['SCDYZ26I02XA'] = { status: 0, score: null, award: null }
  map['SCDYZ26I03XA'] = { status: 0, score: null, award: null }
  map['SCDYZ26J02XA'] = { status: 0, score: null, award: null }
  map['SCDYZ26K01XA'] = { status: 0, score: null, award: null }

  saveScoreMap(map)
  return map
}

export const useScoreStore = defineStore('score', () => {
  const scoreMap = ref<Record<string, ScoreState>>(buildDefaultMap())
  const keyword = ref('')
  const school = ref('')
  const filterStatus = ref<number | null>(null)
  const selectedCodes = ref<string[]>([])
  const editingScores = ref<Record<string, number>>({})

  /* 评委评分覆盖（重新评分的记录） key: "code|judgeName" → score */
  const judgeOverrides = ref<Record<string, number | null>>({})

  /* 从 name 中分离大类和小类 */
  function parseCategory(name: string): { majorCategory: string; subCategory: string } {
    const idx = name.indexOf(' / ')
    if (idx !== -1) {
      return {
        majorCategory: name.slice(0, idx),
        subCategory: name.slice(idx + 3),
      }
    }
    /* 无斜杠分隔的项（如工作坊、案例等） */
    return { majorCategory: name, subCategory: '—' }
  }

  /* 所有项目（合并分数状态 + 评委覆盖） */
  const allPrograms = computed<ProgramWithScore[]>(() => {
    return MOCK_PROGRAMS.map(p => {
      const s = scoreMap.value[p.code] || { status: 0, score: null, award: null }
      const { majorCategory, subCategory } = parseCategory(p.name)
      const ext = MOCK_JUDGE_DATA[p.code] || { count: 1, judges: [] }
      /* 合并评委覆盖 */
      const judges = ext.judges.map(j => {
        const key = `${p.code}|${j.name}`
        if (key in judgeOverrides.value) {
          return { ...j, score: judgeOverrides.value[key] }
        }
        return j
      })
      return { ...p, ...s, majorCategory, subCategory, participantCount: ext.count, judges }
    })
  })

  /* 按关键词和状态筛选后的列表 */
  const filteredPrograms = computed<ProgramWithScore[]>(() => {
    let list = allPrograms.value
    if (keyword.value) {
      const kw = keyword.value
      list = list.filter(d => d.name.includes(kw) || d.code.includes(kw.toUpperCase()))
    }
    if (school.value) {
      list = list.filter(d => d.school.includes(school.value))
    }
    if (filterStatus.value !== null) {
      list = list.filter(d => d.status === filterStatus.value)
    }
    return list
  })

  /* 提交评分（未评 → 已评） */
  function submitScore(code: string, score: number) {
    scoreMap.value[code] = { status: 1, score, award: null }
    saveScoreMap(scoreMap.value)
  }

  /* 标记弃赛 */
  function markAbandoned(code: string) {
    scoreMap.value[code] = { status: -2, score: null, award: null }
    saveScoreMap(scoreMap.value)
  }

  /* 标记同校弃赛 */
  function markSameSchoolAvoid(code: string) {
    scoreMap.value[code] = { status: -2, score: null, award: null }
    saveScoreMap(scoreMap.value)
  }

  /* 申请重评（已评 → 未评） */
  function requestRescore(code: string) {
    scoreMap.value[code] = { status: 0, score: null, award: null }
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

  /* 重置某个评委的评分为未评 */
  function resetJudgeScore(code: string, judgeName: string) {
    const key = `${code}|${judgeName}`
    judgeOverrides.value = { ...judgeOverrides.value, [key]: null }
  }

  return {
    scoreMap, keyword, school, filterStatus, selectedCodes, editingScores,
    allPrograms, filteredPrograms, judgeOverrides,
    submitScore, markAbandoned, markSameSchoolAvoid, requestRescore, submitToFinal, batchSubmit,
    resetJudgeScore,
  }
})
