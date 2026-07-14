/*
   API 全局配置 — 统一接口地址 & 常量
   四川省大学生艺术展演 · 评分系统
   */

/** 后端 API 基础地址（按环境切换） */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://106.53.9.56:7066/api'

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 15000

/** localStorage 键名 */
export const STORAGE_KEYS = {
  TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
} as const

/** 后端 API 前缀（Django Ninja 无统一前缀） */
export const API_PREFIX = ''
