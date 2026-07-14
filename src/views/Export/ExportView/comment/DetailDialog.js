import request from '@/utils/request'

/**
 * 管理端 — 获取节目详情（含专家评分明细）
 * GET /api/admin/programs/{program_id}
 * @param {number} programId
 * @returns {Promise<object>}
 */
export async function fetchProgramDetail(programId) {
  const res = await request.get(`/admin/programs/${programId}`)
  const data = res.data?.data ?? {}
  return {
    id: data.id ?? programId,
    program_code: data.program_code ?? '',
    program_name: data.program_name ?? '',
    major_category: data.major_category ?? '',
    sub_category: data.sub_category ?? '',
    detail_category: data.detail_category ?? '',
    school_name: data.school_name ?? '',
    program_status: data.program_status ?? '',
    exempt_reason: data.exempt_reason ?? null,
    scores: (data.scores ?? []).map(s => ({
      reviewer_id: s.reviewer_id,
      reviewer_name: s.reviewer_name,
      reviewer_school: s.reviewer_school,
      score: s.score ?? null,
      status: s.status ?? null,
      is_excluded: s.is_excluded ?? false,
      exclude_reason: s.exclude_reason ?? null,
      submitted_at: s.submitted_at ?? null,
    })),
  }
}
