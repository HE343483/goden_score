/* 认证 API — 登录 / 登出 */
import request from '@/utils/request'
import { AUTH } from './endpoints'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    username: string
    name: string
    role: 'reviewer' | 'admin'
  }
}

/** POST /api/auth/login */
export function loginApi(params: LoginParams): Promise<LoginResult> {
  return request.post(AUTH.LOGIN, params).then((res) => res.data)
}

/** POST /api/auth/logout */
export function logoutApi(): Promise<void> {
  return request.post(AUTH.LOGOUT)
}
