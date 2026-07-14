import request from '@/utils/request'

/**
 * 专家端 API — ScoringView 专用
 * 所有与 /api/expert 相关的接口调用统一放在这里
 */

/* ── 后端 score_status 与本地 status 映射 ── */
const STATUS_MAP = {
  unscored: 0,    // 未评分（可评分）
  draft: 1,       // 已保存（草稿）
  submitted: 2,   // 已提交（锁定不可修改）
  no_score: -1,   // 无需评分（弃赛/同校回避）
}

/**
 * @param {object} api —— 后端返回的原始节目数据
 * @param {number} api.id
 * @param {string} api.program_code
 * @param {string} api.program_name
 * @param {string} api.major_category
 * @param {string} api.sub_category
 * @param {string} api.detail_category
 * @param {string} api.team_type
 * @param {string} api.group_level
 * @param {string} api.school_name
 * @param {string} api.score_status
 * @param {string|null} api.no_score_reason
 * @param {number|null} api.score
 */
function mapApiToProgram(api) {
  return {
    type: api.major_category + '/' + (api.sub_category ?? '') + '/' + (api.detail_category ?? '') + '/' + api.team_type,
    id: api.id,
    code: api.program_code,
    name: api.program_name,
    majorCategory: api.major_category,
    subCategory: api.sub_category,
    group: api.group_level,
    school: api.school_name,
    score: api.score ?? null,
    status: STATUS_MAP[api.score_status] ?? 0,
    noScoreReason: api.no_score_reason ?? null,
    participantCount: 0,
    award: '',
    judges: [],
  }
}

/**
 * 拉取专家分配的项目列表
 * GET /api/expert/programs
 * @param {{ page?: number, limit?: number, status?: string, keyword?: string }} params
 * @returns {Promise<{ list: Array, total: number }>}
 */
export async function fetchExpertPrograms(params = {}) {
  const { page = 1, limit = 100, status, keyword } = params
  const query = { page, limit }
  if (status) query.status = status
  if (keyword) query.keyword = keyword
  const res = await request.get('/expert/programs', { params: query })
  const list = (res.data?.data ?? []).map(mapApiToProgram)
  return {
    list,
    total: res.data?.count ?? 0,
  }
}

/**
 * 保存评分
 * POST /api/expert/scores/save
 * @param {Array<{ program_id: number, score: number }>} items
 */
export async function saveScores(payload) {
  const res = await request.post('/expert/scores/save', payload)
  return res.data
}

/**
 * 提交评分（锁定不可修改）
 * POST /api/expert/scores/submit
 * @param {{ items: Array<{ program_id: number, score: number }> }} payload
 */
export async function submitScores(payload) {
  const res = await request.post('/expert/scores/submit', payload)
  return res.data
}
