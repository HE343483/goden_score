import request from '@/utils/request'

/**
 * 专家账号 API
 */

/**
 * 获取专家列表
 * GET /api/admin/experts
 * @param {{ page?: number, limit?: number, school?: string, status?: string }} params
 * @returns {Promise<{ list: Array, total: number }>}
 */
export async function fetchExperts(params = {}) {
  const { page = 1, limit = 15, school, status } = params
  const query = { page, limit }
  if (school) query.school = school
  if (status) query.status = status
  const res = await request.get('/admin/experts', { params: query })
  return {
    list: (res.data?.data ?? []).map(mapExpertApi),
    total: res.data?.count ?? 0,
  }
}

/**
 * 获取学校列表（用于下拉筛选）
 * GET /api/admin/schools
 * @returns {Promise<string[]>}
 */
export async function fetchSchoolList() {
  const res = await request.get('/admin/schools')
  return res.data?.data ?? []
}

/**
 * 更改专家状态
 * PUT /api/admin/experts/{id}/status
 * @param {number} id
 * @param {string} status
 */
export async function updateExpertStatus(id, status) {
  await request.put(`/admin/experts/${id}`, { status })
}

/**
 * 分配专家到学校
 * PUT /api/admin/experts/{id}/assign-school
 * @param {number} id
 * @param {string} schoolName — 学校名称
 */
export async function assignExpertSchool(id, schoolName) {
  await request.put(`/admin/experts/${id}/assign-school`, { school_name: schoolName })
}

/**
 * 获取专家分配节目列表
 * GET /api/admin/assignments?expertId=
 * @param {number} expertId
 * @returns {Promise<Array>}
 */
export async function fetchExpertAssignments(expertId) {
  const res = await request.get('/admin/assignments', { params: { expertId } })
  return (res.data?.data ?? []).map(mapAssignmentApi)
}

/**
 * 映射分配节目数据
 */
function mapAssignmentApi(api) {
  return {
    id: api.id,
    program_id: api.program_id ?? api.project_type_id,
    project_code: api.project_code ?? '',
    program_name: api.program_name ?? api.detail_category ?? '',
    major_category: api.major_category ?? '',
    sub_category: api.sub_category ?? '',
    detail_category: api.detail_category ?? '',
    school_name: api.school_name ?? api.expert_school ?? '',
    team_type: api.team_type ?? '',
    group_level: api.group_level ?? '',
    scoring_status: api.scoring_status ?? api.status ?? 'pending',
    score: api.score ?? null,
  }
}

/* ── 数据映射 ── */

function mapExpertApi(api) {
  return {
    id: api.id,
    account: api.username ?? '',
    name: api.name ?? '',
    school: api.school_name ?? '',
    schoolId: api.school_id ?? null,
    status: api.status ?? 'disabled',
    statusLabel: api.status === 'enabled' ? '启用' : '停用',
  }
}
