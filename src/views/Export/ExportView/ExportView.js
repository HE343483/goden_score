import request from '@/utils/request'

/**
 * 管理端 API — ExportView 专用
 * 所有与 /api/admin 相关的接口调用统一放在这里
 */

/**
 * 管理端 — 获取全局统计
 * GET /api/admin/dashboard
 * @returns {Promise<object>}
 */
export async function fetchAdminStats() {
  const res = await request.get('/admin/dashboard')
  const data = res.data?.data ?? res.data ?? {}
  return {
    total_programs:     data.total_programs ?? 0,
    pending:            data.pending ?? 0,
    partial:            data.partial ?? 0,
    completed:          data.completed ?? 0,
    exempt:             data.exempt ?? 0,
    total_assignments:  data.total_assignments ?? 0,
    effective_scored:   data.effective_scored ?? 0,
    excluded:           data.excluded ?? 0,
    unscored:           data.unscored ?? 0,
    total_experts:      data.total_experts ?? 0,
    enabled_experts:    data.enabled_experts ?? 0,
  }
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
 * @param {number} api.school_id
 * @param {string} api.program_status
 * @param {string|null} api.exempt_reason
 * @param {number} api.effective_count
 * @param {number} api.excluded_count
 * @param {number|null} api.avg_score
 * @param {number|null} api.min_score
 * @param {number|null} api.max_score
 * @param {number} api.total_reviewers
 */
function mapAdminApiToProgram(api) {
  return {
    id: api.id,
    code: api.program_code,
    name: api.program_name,
    school: api.school_name,
    schoolId: api.school_id,
    majorCategory: api.major_category,
    subCategory: api.sub_category,
    detailCategory: api.detail_category,
    group: api.group_level,
    teamType: api.team_type,
    type: api.major_category + '/' + (api.sub_category ?? '') + '/' + (api.detail_category ?? '') + '/' + api.team_type,
    score: api.avg_score ?? null,
    minScore: api.min_score ?? null,
    maxScore: api.max_score ?? null,
    status: api.program_status,
    exemptReason: api.exempt_reason ?? null,
    effectiveCount: api.effective_count ?? 0,
    excludedCount: api.excluded_count ?? 0,
    totalReviewers: api.total_reviewers ?? 0,
    participantCount: 0,
    award: '',
    judges: [],
  }
}

/**
 * 管理端 — 获取所有节目列表
 * GET /api/admin/programs
 * @param {{ page?: number, limit?: number, keyword?: string, major_category?: string, sub_category?: string, detail_category?: string, group_level?: string, program_status?: string, school_id?: number }} params
 * @returns {Promise<{ list: Array, total: number }>}
 */
export async function fetchAdminPrograms(params = {}) {
  const { page = 1, limit = 100, keyword, major_category, sub_category, detail_category, group_level, program_status, school_id } = params
  const query = { page, limit }
  if (keyword) query.keyword = keyword
  if (major_category) query.major_category = major_category
  if (sub_category) query.sub_category = sub_category
  if (detail_category) query.detail_category = detail_category
  if (group_level) query.group_level = group_level
  if (program_status) query.program_status = program_status
  if (school_id !== undefined) query.school_id = school_id
  const res = await request.get('/admin/programs', { params: query })
  return {
    list: (res.data?.data ?? []).map(mapAdminApiToProgram),
    total: res.data?.count ?? 0,
  }
}

/**
 * 管理端 — 更新豁免状态（弃赛/取消弃赛）
 * POST /api/admin/exemptions
 * @param {{ program_id: number, exemption_type: 'abandoned'|'cancel_abandoned'|'manual_exclude'|'cancel_exclude', reviewer_id?: number }} payload
 */
export async function updateExemption(payload) {
  await request.post('/admin/exemptions', payload)
}

/**
 * 导出接口 — ExportDialog 专用
 * GET /api/admin/exports/{export_type}
 *
 * export_type:
 *   1 / score  → 成绩表
 *   2 / public → 公示表
 *   3 / expert → 专家评分汇总表
 *
 * @param {number} exportType - 1/2/3
 * @param {{ category?: string, majorCategory?: string, subCategory?: string, group?: string, keyword?: string, status?: string, title?: string }} params
 * @returns {Promise<void>} — 下载 Excel 文件
 */
export async function exportData(exportType, params = {}) {
  const res = await request.get(`/admin/exports/${exportType}`, {
    params,
    responseType: 'blob',
  })

  /* ── 从 Content-Disposition 头提取文件名 ── */
  const disposition = res.headers['content-disposition']
  let filename = 'export.xlsx'
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=utf-8''(.+)/)
    if (utf8Match) {
      filename = decodeURIComponent(utf8Match[1])
    } else {
      const fallback = disposition.match(/filename="?([^";\n]+)"?/)
      if (fallback) filename = fallback[1]
    }
  }

  /* ── 触发浏览器下载 ── */
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
