import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  username: string
  name: string
  role: 'expert' | 'exporter'
}

/* 模拟用户数据库 */
const USER_DB: Record<string, { password: string; name: string; role: User['role'] }> = {
  expert: { password: 'expert123', name: '张专家', role: 'expert' },
  export: { password: 'export123', name: '导出员', role: 'exporter' },
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => user.value !== null)
  const isExpert = computed(() => user.value?.role === 'expert')
  const isExporter = computed(() => user.value?.role === 'exporter')
  const userName = computed(() => user.value?.name ?? '')

  /* 登录验证 */
  function login(username: string, password: string): boolean {
    const record = USER_DB[username]
    if (!record || record.password !== password) return false
    user.value = { username, name: record.name, role: record.role }
    localStorage.setItem('user', JSON.stringify(user.value))
    return true
  }

  /* 退出登录 */
  function logout() {
    user.value = null
    localStorage.removeItem('user')
  }

  /* 从 localStorage 恢复登录状态 */
  function restore() {
    const raw = localStorage.getItem('user')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.username && parsed.name && parsed.role) {
        user.value = parsed
      } else {
        localStorage.removeItem('user')
      }
    } catch {
      localStorage.removeItem('user')
    }
  }

  return { user, isLoggedIn, isExpert, isExporter, userName, login, logout, restore }
})
