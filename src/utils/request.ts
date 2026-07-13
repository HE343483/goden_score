/* ═══════════════════════════════════════
   HTTP 请求工具 — Axios 实例 + 拦截器
   统一处理: JWT 注入 / 401 重定向 / 错误提示
   ═══════════════════════════════════════ */

import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL, REQUEST_TIMEOUT, STORAGE_KEYS } from '@/api/config'

/* ── 创建实例 ── */

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

/* ── 请求拦截器：自动注入 JWT ── */

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

/* ── 响应拦截器：统一错误处理 ── */

/** 后端错误响应体格式 */
interface ApiErrorBody {
  code?: string
  message?: string
  errors?: unknown
}

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '权限不足，无法执行此操作',
  404: '请求的资源不存在',
  405: '请求方法不允许',
  409: '操作冲突，请刷新后重试',
  422: '提交的数据校验失败',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误，请稍后重试',
  502: '网关错误，请稍后重试',
  503: '服务暂不可用，请稍后重试',
}

/**
 * 从后端错误体提取人类可读消息
 */
function extractMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object') {
    const body = data as ApiErrorBody
    if (body.message) return body.message
  }
  return HTTP_ERROR_MESSAGES[status] ?? `请求异常 (${status})`
}

request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 业务层 code 非 0 也算异常（后端约定 { code: 0 } 为成功）
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0 && body.code !== '0') {
      const message = (body as ApiErrorBody).message ?? '操作失败'
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return response
  },
  (error: AxiosError) => {
    const status = error.response?.status ?? 0
    const data = error.response?.data
    const message = extractMessage(status, data)

    // ── 401：登录过期，清空状态并跳转登录页 ──
    if (status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER)
      // 避免在登录页本身弹重复消息
      if (!window.location.pathname.startsWith('/login')) {
        ElMessage.error(message)
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // ── 403：权限不足 ──
    else if (status === 403) {
      ElMessage.error(message)
    }

    // ── 404：资源不存在 ──
    else if (status === 404) {
      ElMessage.error(message)
    }

    // ── 405：方法不允许 ──
    else if (status === 405) {
      ElMessage.error(message)
    }

    // ── 409：操作冲突 ──
    else if (status === 409) {
      ElMessage.error(message)
    }

    // ── 422 / 400：校验错误 ──
    else if (status === 422 || status === 400) {
      ElMessage.error(message)
    }

    // ── 429：限流 ──
    else if (status === 429) {
      ElMessage.error(message)
    }

    // ── 5xx：服务器错误 ──
    else if (status >= 500) {
      ElMessage.error(message)
    }

    // ── 网络断开 / 超时 ──
    else if (!error.response) {
      ElMessage.error('网络连接失败，请检查网络后重试')
    }

    return Promise.reject(error)
  },
)

export default request
