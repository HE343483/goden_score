import { API_BASE_URL } from '@/api/config'

/**
 * 调用登录接口
 * POST /api/auth/login
 * @param {string} username 账号
 * @param {string} password 密码
 * @returns {Promise<{ token: string, refresh_token: string, user: object }>}
 */
export async function doLoginApi(username, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json()

  // code 不为 0 时抛出后端的 msg
  if (body.code !== 0) {
    throw new Error(body.msg || '登录失败')
  }

  const { token, refresh_token, user } = body.data

  // 存储 token，请求拦截器会自动注入到 Authorization header
  localStorage.setItem('accessToken', token)
  localStorage.setItem('refreshToken', refresh_token)

  return { token, refresh_token, user }
}
