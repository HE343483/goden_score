import request from '@/utils/request'
import { COMMONS } from '@/api/endpoints'

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

/* 反向映射：本地数字 → API 字符串 */
const STATUS_TO_API = {
  0: 'unscored',
  1: 'draft',
  2: 'submitted',
  [-1]: 'no_score',
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
 * 模糊查询学校列表
 * GET /api/expert/schools
 * @param {string} keyword 学校名称关键字
 * @returns {Promise<{ data: Array }>}
 */
export async function fetchSchools(keyword) {
  const res = await request.get('/expert/schools', { params: { keyword, limit: 200 } })
  return res.data ?? { data: [] }
}

/**
 * 拉取专家分配的项目列表
 * GET /api/expert/programs
 * @param {{ page?: number, limit?: number, status?: string, keyword?: string, school_id?: number }} params
 * @returns {Promise<{ list: Array, total: number }>}
 */
export async function fetchExpertPrograms(params = {}) {
  const { page = 1, limit = 100, status, keyword, school_id } = params
  const query = { page, limit }
  if (status) query.status = status
  if (keyword) query.keyword = keyword
  if (school_id !== undefined) query.school_id = school_id
  const res = await request.get('/expert/programs', { params: query })
  const list = (res.data?.data ?? []).map(mapApiToProgram)
  return {
    list,
    total: res.data?.count ?? 0,
  }
}

export { STATUS_TO_API }

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

/**
 * 上传成绩表图片
 * POST /api/upload（multipart/form-data，字段名 file）
 * 需 JWT（request 拦截器自动注入）；仅 jpg/jpeg/png，≤5MB
 * @param {File} file 图片文件
 * @returns {Promise<{ id: number, url: string }|null>} 图片记录 id 与访问 url
 */
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  // 必须显式把 Content-Type 置为 undefined：
  // request 实例默认头是 application/json，axios 检测到 JSON 头会把 FormData
  // 转成 JSON 字符串（{"file":{}}），后端收不到文件字段导致 422。
  // 置空后由浏览器自动生成 multipart/form-data 并携带 boundary。
  const res = await request.post(COMMONS.UPLOAD, formData, {
    headers: { 'Content-Type': undefined },
  })
  return res.data?.data ?? null
}

/**
 * OCR 表格识别
 * POST /api/ocr/recognize（需 JWT 认证，识别结果写入当前专家 scores 草稿）
 * @param {{ image_id: number, url: string }} payload 图片记录 id 与可访问地址
 * @returns {Promise<object|null>} data：recognized_count / summary / rows
 */
export async function recognizeOCR(payload) {
  const res = await request.post(COMMONS.OCR_RECOGNIZE, {
    image_id: payload.image_id,
    url: payload.url,
    need_rotate: true,
  })
  return res.data?.data ?? null
}
