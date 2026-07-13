import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/* ── 类型定义 ── */

export interface JudgeScore {
  name: string
  score: number | null
}

export interface ProgramWithScore {
  code: string
  name: string
  school: string
  majorCategory: string
  subCategory: string
  group: string
  teamType: string
  participantCount: number
  score: number | null
  status: number       // 0:未评分 1:已评分 2:已提交 -1:无需评分 -2:弃赛 -3:回避
  award: string
  judges: JudgeScore[]
}

/* ── Mock 数据 ── */

const MOCK_PROGRAMS: ProgramWithScore[] = [
  { code: 'SCDYZ26B01XA', name: '青春之歌（声乐）', school: '四川大学', majorCategory: '艺术表演类（集体项目）', subCategory: '声乐作品报名', group: '甲组', teamType: '集体', participantCount: 40, score: 92.5, status: 2, award: '一等奖', judges: [{ name: '张专家', score: 92.0 }, { name: '李专家', score: 93.0 }] },
  { code: 'SCDYZ26B02XA', name: '茉莉花（声乐）', school: '电子科技大学', majorCategory: '艺术表演类（集体项目）', subCategory: '声乐作品报名', group: '甲组', teamType: '集体', participantCount: 35, score: 88.0, status: 1, award: '二等奖', judges: [{ name: '张专家', score: 87.0 }, { name: '李专家', score: 89.0 }] },
  { code: 'SCDYZ26B03XA', name: '蜀绣（舞蹈）', school: '西南交通大学', majorCategory: '艺术表演类（集体项目）', subCategory: '舞蹈作品报名', group: '乙组', teamType: '集体', participantCount: 24, score: 95.0, status: 2, award: '一等奖', judges: [{ name: '王专家', score: 95.5 }, { name: '赵专家', score: 94.5 }] },
  { code: 'SCDYZ26C01XA', name: '春江花月夜（器乐）', school: '四川音乐学院', majorCategory: '艺术表演类（集体项目）', subCategory: '器乐作品报名', group: '甲组', teamType: '集体', participantCount: 50, score: 90.5, status: 1, award: '', judges: [{ name: '张专家', score: 91.0 }, { name: '李专家', score: 90.0 }] },
  { code: 'SCDYZ26C02XA', name: '茶馆（戏剧）', school: '四川师范大学', majorCategory: '艺术表演类（集体项目）', subCategory: '戏剧（戏曲）作品报名', group: '甲组', teamType: '集体', participantCount: 12, score: 87.0, status: 0, award: '', judges: [{ name: '张专家', score: null }, { name: '李专家', score: null }] },
  { code: 'SCDYZ26F01XA', name: '蜀道难（朗诵）', school: '西南财经大学', majorCategory: '艺术表演类（集体项目）', subCategory: '朗诵作品报名', group: '乙组', teamType: '集体', participantCount: 4, score: 86.5, status: 0, award: '', judges: [{ name: '王专家', score: null }, { name: '赵专家', score: null }] },
  { code: 'SCDYZ26B04XA', name: '我的祖国（声乐）', school: '成都大学', majorCategory: '艺术表演类（个人项目）', subCategory: '声乐作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 91.0, status: 1, award: '一等奖', judges: [{ name: '张专家', score: 91.0 }] },
  { code: 'SCDYZ26C04XA', name: '二泉映月（器乐）', school: '四川大学', majorCategory: '艺术表演类（个人项目）', subCategory: '器乐作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 83.0, status: 0, award: '', judges: [{ name: '李专家', score: null }] },
  { code: 'SCDYZ26B05XA', name: '雀之灵（舞蹈）', school: '四川音乐学院', majorCategory: '艺术表演类（个人项目）', subCategory: '舞蹈作品报名', group: '乙组', teamType: '个人', participantCount: 1, score: 94.0, status: 2, award: '一等奖', judges: [{ name: '王专家', score: 94.0 }] },
  { code: 'SCDYZ26C05XA', name: '川剧变脸（戏曲）', school: '四川艺术学院', majorCategory: '艺术表演类（个人项目）', subCategory: '戏曲作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: null, status: -2, award: '', judges: [{ name: '张专家', score: null }] },
  { code: 'SCDYZ26F02XA', name: '将进酒（朗诵）', school: '电子科技大学', majorCategory: '艺术表演类（个人项目）', subCategory: '朗诵作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 85.5, status: 0, award: '', judges: [{ name: '赵专家', score: null }] },
  { code: 'SCDYZ26D01XA', name: '山水（绘画）', school: '四川美术学院', majorCategory: '学生艺术作品类', subCategory: '绘画作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 93.0, status: 2, award: '一等奖', judges: [{ name: '李专家', score: 93.0 }] },
  { code: 'SCDYZ26D02XA', name: '兰亭序（书法）', school: '四川大学', majorCategory: '学生艺术作品类', subCategory: '书法作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 89.0, status: 1, award: '二等奖', judges: [{ name: '张专家', score: 89.0 }] },
  { code: 'SCDYZ26D03XA', name: '方寸之间（篆刻）', school: '西南交通大学', majorCategory: '学生艺术作品类', subCategory: '篆刻作品报名', group: '乙组', teamType: '个人', participantCount: 1, score: null, status: 0, award: '', judges: [{ name: '王专家', score: null }] },
  { code: 'SCDYZ26D04XA', name: '城市印象（摄影）', school: '成都理工大学', majorCategory: '学生艺术作品类', subCategory: '摄影作品报名', group: '甲组', teamType: '个人', participantCount: 1, score: 82.0, status: 0, award: '', judges: [{ name: '赵专家', score: null }] },
]

/* ── Store ── */

export const useScoreStore = defineStore('score', () => {
  /* ── 状态 ── */
  const allPrograms = ref<ProgramWithScore[]>(MOCK_PROGRAMS)
  const keyword = ref('')
  const filterStatus = ref<number | null>(null)
  const school = ref('')
  const editingScores = ref<Record<string, number>>({})
  const selectedCodes = ref<string[]>([])

  /* ── 计算属性 ── */
  const filteredPrograms = computed(() => {
    let list = allPrograms.value
    if (keyword.value) {
      const kw = keyword.value.toLowerCase()
      list = list.filter(d => d.code.toLowerCase().includes(kw) || d.name.toLowerCase().includes(kw))
    }
    if (filterStatus.value !== null) {
      list = list.filter(d => d.status === filterStatus.value)
    }
    if (school.value) {
      list = list.filter(d => d.school.includes(school.value))
    }
    return list
  })

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
    // 重新计算综合分（取有效评分的平均）
    const validScores = judges.filter(j => j.score !== null).map(j => j.score!) as number[]
    const newScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null
    allPrograms.value[idx] = { ...item, judges, score: newScore, status: validScores.length > 0 ? 1 : 0 }
  }

  return {
    allPrograms,
    keyword,
    filterStatus,
    school,
    editingScores,
    selectedCodes,
    filteredPrograms,
    submitScore,
    markAbandoned,
    requestRescore,
    submitToFinal,
    markSameSchoolAvoid,
    resetJudgeScore,
  }
})
