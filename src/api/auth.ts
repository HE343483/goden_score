/* ═══════════════════════════════════════
   认证模块 API 函数
   每个函数负责一个后端接口的调用
   ═══════════════════════════════════════ */

import request from '@/utils/request'
import { AUTH } from './endpoints'

/* ── 类型定义 ── */

/** 登录请求参数 */
export interface LoginParams {
  account: string
  password: string
}

/** 用户信息（后端返回） */
export interface UserInfo {
  id: number
  name: string
  account: string
  role: string
}

/** 登录成功返回值 */
export interface LoginResult {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: UserInfo
}

/* ── API 函数 ── */

/**
 * 登录
 * POST /auth/login
 *
 * 调用:
 *   const res = await loginApi({ account: 'admin', password: 'admin123' })
 *   // res.data.accessToken → JWT token
 */
export function loginApi(params: LoginParams) {
  return request.post<LoginResult>(AUTH.LOGIN, params)
}

/**
 * 获取当前用户信息
 * GET /auth/me
 */
export function getMeApi() {
  return request.get<UserInfo>(AUTH.ME)
}

/**
 * 退出登录
 * POST /auth/logout
 */
export function logoutApi() {
  return request.post(AUTH.LOGOUT)
}
