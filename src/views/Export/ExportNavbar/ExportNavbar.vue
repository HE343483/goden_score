<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Download, User } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const sidebarCollapsed = ref(false)

/* 导航菜单配置 */
const menuItems = [
  { path: '/export/list', name: '评分数据导出', icon: Download },
  { path: '/export/experts', name: '专家账号管理', icon: User },
  // { path: '/export/rules', name: '规则配置', icon: Setting },
]

const activeMenu = computed(() => route.path)

function navigate(path: string) {
  router.push(path)
}

async function logout() {
  const ok = await auth.logout()
  if (ok) router.push('/')
}
</script>

<template>
  <div class="export-layout">
    <!-- 顶栏 -->
    <header class="export-header">
      <div class="header-left">
        <div class="header-brand-icon">
          <el-image src="/logo.png" class="header-logo" />
        </div>
        <div class="header-brand">
          <span class="header-title">管理平台</span>
          <span class="header-subtitle">四川省第十一届大学生艺术展演活动</span>
        </div>
      </div>
      <div class="header-right">
        <span class="header-role">管理人员</span>
        <span class="header-divider">|</span>
        <span class="header-user">{{ auth.userName }}</span>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </header>

    <div class="export-main">
      <!-- 左侧导航栏 -->
      <aside class="export-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <nav class="sidebar-nav">
          <div
            v-for="item in menuItems"
            :key="item.path"
            class="sidebar-item"
            :class="{ active: activeMenu === item.path }"
            @click="navigate(item.path)"
          >
            <el-icon class="sidebar-icon"><component :is="item.icon" /></el-icon>
            <span class="sidebar-label" v-show="!sidebarCollapsed">{{ item.name }}</span>
          </div>
        </nav>
      </aside>

      <!-- 子路由内容 -->
      <div class="export-body">
        <router-view />
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="app-footer">
      <span class="footer-text">© 四川省第十一届大学生艺术展演活动 · 评分系统</span>
    </footer>
  </div>
</template>

<style scoped>
.export-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  position: relative;
}

/* ═══ 顶栏 ═══ */
.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 56px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-brand-icon {
  position: relative;
}

.header-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: block;
}

.header-brand {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 2px;
  line-height: 1.3;
}

.header-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-role {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.header-divider {
  color: var(--color-border);
  font-size: 14px;
}

.header-user {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

.logout-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 5px 14px;
  font-size: 13px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.logout-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}

/* ═══ 主体布局（侧边栏 + 内容） ═══ */
.export-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ═══ 左侧导航栏 ═══ */
.export-sidebar {
  width: 200px;
  min-width: 200px;
  background: var(--color-card);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease, min-width 0.25s ease;
  position: relative;
  z-index: 50;
}

.export-sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

.sidebar-toggle {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-muted);
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
}

.sidebar-toggle:hover {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.toggle-icon {
  transition: transform 0.2s;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 14px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-item:hover {
  color: var(--color-text);
  background: var(--color-accent-light);
}

.sidebar-item.active {
  color: var(--color-accent);
  background: var(--color-accent-light);
  border-left-color: var(--color-accent);
  font-weight: 600;
}

.sidebar-icon {
  font-size: 18px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ═══ 内容区 ═══ */
.export-body {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

/* ═══ 页脚 ═══ */
.app-footer {
  flex-shrink: 0;
  text-align: center;
  padding: 12px 0;
  background: var(--color-card);
  border-top: 1px solid var(--color-border-light);
  position: relative;
  z-index: 1;
}

.footer-text {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

/* ═══ 响应式 ═══ */
@media (max-width: 1024px) {
  .export-body { padding: 20px; }
}

@media (max-width: 768px) {
  .export-sidebar { width: 56px; min-width: 56px; }
  .sidebar-label { display: none; }
  .export-header { padding: 0 16px; }
  .export-body { padding: 16px; }
  .header-role { display: none; }
  .header-divider { display: none; }
}

@media (max-width: 480px) {
  .app-footer { padding: 10px 0; }
  .footer-text { font-size: 11px; }
}
</style>
