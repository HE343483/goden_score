<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

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
          <span class="header-title">评分数据导出</span>
          <span class="header-subtitle">四川省大学生艺术展演</span>
        </div>
      </div>
      <div class="header-right">
        <span class="header-role">管理人员</span>
        <span class="header-divider">|</span>
        <span class="header-user">{{ auth.userName }}</span>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>
    </header>

    <!-- 子路由内容 -->
    <div class="export-body">
      <router-view />
    </div>

    <!-- 页脚 -->
    <footer class="app-footer">
      <span class="footer-text">© 四川省大学生艺术展演 · 评鉴录</span>
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

/* ═══ 背景水印 ═══ */
.bg-watermark {
  position: fixed;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-accent-subtle, rgba(217,68,68,0.035));
  user-select: none;
  pointer-events: none;
  z-index: 0;
  font-size: clamp(200px, 30vw, 400px);
  bottom: -8%;
  right: -4%;
  transform: rotate(-8deg);
  opacity: 0.5;
  letter-spacing: 0;
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
  z-index: 1;
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
  letter-spacing: 2px;
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

/* ═══ 内容区 ═══ */
.export-body {
  flex: 1;
  padding: 28px;
  overflow-y: auto;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
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
  .export-header { padding: 0 16px; }
  .export-body { padding: 16px; }
  .header-role { display: none; }
  .header-divider { display: none; }
}

@media (max-width: 480px) {
  .bg-watermark { display: none; }
  .app-footer { padding: 10px 0; }
  .footer-text { font-size: 11px; }
}
</style>
