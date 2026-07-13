/* API 端点定义 — 所有接口路径汇总
   对应后端 Django Ninja 路由 */

/**
 * 认证模块
 * 对照: scoring/security.py + api.py
 */
export const AUTH = {
  /** POST 登录 { account, password } → { accessToken, refreshToken, user } */
  LOGIN: '/auth/login',
  /** POST 退出登录 */
  LOGOUT: '/auth/logout',
} as const

/**
 * 专家评分模块
 * 对照: scoring/api.py # reviewer_programs / save_scores / submit_scores
 */
export const REVIEWER = {
  /** GET 专家分配项目列表 ?status= */
  PROGRAMS: '/reviewer/programs',
  /** POST 提交评分 { items: [{ programId, score, comment }] } */
  SCORES_SUBMIT: '/reviewer/scores/submit',
} as const

/**
 * 管理模块
 * 对照: scoring/api.py admin_* 路由
 */
export const ADMIN = {
  /** GET 项目列表 ?keyword=&majorCategory=&page=&pageSize= */
  PROGRAMS: '/admin/programs',
  /** PATCH 更新项目状态 { status, schoolName } */
  PROGRAM_UPDATE: (id: number) => `/admin/programs/${id}` as const,

  /** GET 专家列表 */
  EXPERTS: '/admin/experts',
  /** POST 创建专家 */
  EXPERT_CREATE: '/admin/experts',
  /** PATCH 更新专家 */
  EXPERT_UPDATE: (id: number) => `/admin/experts/${id}` as const,

  /** GET 分配列表 ?expertId= */
  ASSIGNMENTS: '/admin/assignments',


  /** GET 评分详情 ?expertId=&programId=&status=&page=&pageSize= */
  SCORES: '/admin/scores',

  /** GET 豁免/弃赛列表 */
  EXEMPTIONS: '/admin/exemptions',
  /** POST 更新豁免 */
  EXEMPTION_UPDATE: '/admin/exemptions',

  /** GET 评分设置 */
  SETTINGS: '/admin/settings',
  /** PATCH 更新设置 */
  SETTINGS_UPDATE: '/admin/settings',
} as const

/**
 * 导出模块
 * 对照: scoring/api.py # export_file
 */
export const EXPORT = {
  /** GET 导出文件 ?type= */
  FILE: (type: string) => `/admin/exports/${type}` as const,
} as const
