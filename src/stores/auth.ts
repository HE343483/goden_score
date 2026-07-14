import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_BASE_URL } from '@/api/config'

export interface User {
  username: string
  name: string
  role: 'reviewer' | 'admin'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => user.value !== null)
  const isReviewer = computed(() => user.value?.role === 'reviewer')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const userName = computed(() => user.value?.name ?? '')

  /* 登录成功后设置用户状态 */
  function setUser(u: User) {
    user.value = u
    sessionStorage.setItem('user', JSON.stringify(u))
  }

  /* 退出登录 — 调用后端 /api/auth/logout，code=0 才清除本地状态 */
  async function logout(): Promise<boolean> {
    const token = localStorage.getItem('accessToken')
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    const body = await res.json()
    if (body.code === 0) {
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
      return true
    }
    return false
  }

  /* 从 sessionStorage 恢复登录状态（刷新保留，关闭浏览器清除） */
  function restore() {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    const raw = sessionStorage.getItem('user')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.username && parsed.role) {
        user.value = parsed
      } else {
        sessionStorage.removeItem('user')
      }
    } catch {
      sessionStorage.removeItem('user')
    }
  }

  return { user, isLoggedIn, isReviewer, isAdmin, userName, setUser, logout, restore }
})
