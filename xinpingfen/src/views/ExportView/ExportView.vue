<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore } from '@/stores/score'

const router = useRouter()
const auth = useAuthStore()
const store = useScoreStore()

const activeTab = ref('all')
const exporting = ref(false)
const lastExportTime = ref<string | null>(null)

/* 所有数据 */
const allData = computed(() => store.allPrograms)

/* 按筛选标签过滤 */
const filteredData = computed(() => {
  const list = allData.value
  switch (activeTab.value) {
    case 'scored':    return list.filter(d => d.status >= 1)
    case 'submitted': return list.filter(d => d.status === 2)
    case 'abandoned': return list.filter(d => d.status === -2)
    default:          return list
  }
})

/* 统计数值 */
const stats = computed(() => {
  const list = allData.value
  return {
    total:     list.length,
    scored:    list.filter(d => d.status >= 1).length,
    submitted: list.filter(d => d.status === 2).length,
    abandoned: list.filter(d => d.status === -2).length,
  }
})

function getStatusText(status: number): string {
  switch (status) {
    case 0:   return '未评分'
    case 1:   return '已评分'
    case 2:   return '已提交'
    case -1:  return '无需评分'
    case -2:  return '弃赛'
    case -3:  return '回避'
    default:  return '—'
  }
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

function exportCSV() {
  exporting.value = true
  /* 短延迟让动画播放 */
  setTimeout(() => {
    const BOM = '﻿'
    const headers = ['项目编码', '项目名称', '大类', '类别', '组别', '形式', '分数', '状态']
    const rows = filteredData.value.map(d => [
      d.code,
      `"${d.name}"`,
      d.majorCategory,
      d.subCategory,
      d.group,
      d.teamType,
      formatScore(d.score),
      getStatusText(d.status),
    ])
    const csv = BOM + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    a.download = `艺术展演评分表_${ts}.csv`
    a.click()
    URL.revokeObjectURL(url)

    lastExportTime.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    exporting.value = false
    ElMessage.success(`已导出 ${filteredData.value.length} 项数据`)
  }, 300)
}

function logout() {
  auth.logout()
  router.push('/login')
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
          <span class="header-title">评分导出</span>
          <span class="header-subtitle">四川省大学生艺术展演</span>
        </div>
      </div>
      <div class="header-right">
        <span class="header-role">导出员</span>
        <span class="header-divider">|</span>
        <span class="header-user">{{ auth.userName }}</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <!-- 内容 -->
    <div class="export-body">
      <!-- 统计卡片行列 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-accent stat-accent--total"></div>
          <div class="stat-body">
            <span class="stat-num">{{ stats.total }}</span>
            <span class="stat-label">总项目</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent--scored"></div>
          <div class="stat-body">
            <span class="stat-num">{{ stats.scored }}</span>
            <span class="stat-label">已评分</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent--submitted"></div>
          <div class="stat-body">
            <span class="stat-num">{{ stats.submitted }}</span>
            <span class="stat-label">已提交</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent--abandoned"></div>
          <div class="stat-body">
            <span class="stat-num">{{ stats.abandoned }}</span>
            <span class="stat-label">弃赛</span>
          </div>
        </div>
      </div>

      <!-- 表格卡片 -->
      <div class="table-card">
        <!-- 标题行 + 筛选 + 导出 -->
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <h2 class="section-title">评分列表</h2>
            <span class="section-count">{{ filteredData.length }} 项</span>
          </div>
          <div class="table-toolbar-right">
            <!-- 状态筛选 -->
            <div class="filter-pills">
              <button
                :class="['pill', activeTab === 'all' && 'pill--active']"
                @click="activeTab = 'all'"
              >全部</button>
              <button
                :class="['pill', activeTab === 'scored' && 'pill--active']"
                @click="activeTab = 'scored'"
              >已评分</button>
              <button
                :class="['pill', activeTab === 'submitted' && 'pill--active']"
                @click="activeTab = 'submitted'"
              >已提交</button>
              <button
                :class="['pill', activeTab === 'abandoned' && 'pill--active']"
                @click="activeTab = 'abandoned'"
              >弃赛</button>
            </div>
            <el-button
              type="primary"
              size="default"
              :loading="exporting"
              :class="{ 'seal-btn': !exporting }"
              @click="exportCSV"
            >
              <span v-if="!exporting" class="seal-btn-inner">
                <span>导出</span>
              </span>
              <span v-else>导出中…</span>
            </el-button>
          </div>
        </div>

        <!-- 导出时间戳 -->
        <div v-if="lastExportTime" class="export-meta">
          上次导出：{{ lastExportTime }}
        </div>

        <!-- 表格 -->
        <el-table
          :data="filteredData"
          border
          size="small"
          style="width:100%"
          stripe
        >
          <el-table-column type="index" label="序号" width="50" align="center" header-align="center" />

          <el-table-column prop="code" label="项目编码" width="150" align="center" header-align="center">
            <template #default="{ row }">
              <code class="code-cell">{{ row.code }}</code>
            </template>
          </el-table-column>

          <el-table-column prop="name" label="项目名称" min-width="180" header-align="left">
            <template #default="{ row }">
              <span class="name-cell">{{ row.name }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="subCategory" label="类别" width="100" align="center" header-align="center" />

          <el-table-column prop="group" label="组别" width="60" align="center" header-align="center" />

          <el-table-column prop="teamType" label="形式" width="60" align="center" header-align="center" />

          <el-table-column label="分数" width="90" align="center" header-align="center">
            <template #default="{ row }">
              <span :class="['score-cell', row.status === 2 ? 'score-cell--final' : '', row.status === 1 ? 'score-cell--draft' : '']">
                {{ formatScore(row.score) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100" align="center" header-align="center">
            <template #default="{ row }">
              <span :class="['status-badge', `status-badge--${row.status}`]">
                <span class="status-dot"></span>
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 表格底部摘要 -->
        <div class="table-footer">
          <span class="table-footer-text">
            共 {{ filteredData.length }} 项
            <template v-if="activeTab === 'all'">
              · 已评分 {{ stats.scored }} · 已提交 {{ stats.submitted }} · 弃赛 {{ stats.abandoned }}
            </template>
          </span>
        </div>
      </div>
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

/* ═══ 统计卡片网格 ═══ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.stat-accent {
  height: 3px;
  flex-shrink: 0;
}

.stat-accent--total     { background: var(--color-text); }
.stat-accent--scored    { background: #3A7AB5; }
.stat-accent--submitted { background: var(--color-jade); }
.stat-accent--abandoned { background: var(--color-accent); }

.stat-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 16px 16px;
}

.stat-num {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.15;
  letter-spacing: -1px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 5px;
  letter-spacing: 1px;
}

/* ═══ 表格卡片 ═══ */
.table-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 20px 20px 0;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

/* 工具栏 */
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.table-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.section-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 1px;
}

.section-count {
  font-size: 12.5px;
  color: var(--color-text-muted);
}

.table-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 筛选药丸按钮 */
.filter-pills {
  display: flex;
  gap: 4px;
  background: var(--color-bg-subtle, #EDE9E0);
  padding: 3px;
  border-radius: var(--radius-sm);
}

.pill {
  border: none;
  background: transparent;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  transition: all 0.2s;
}

.pill:hover {
  color: var(--color-text);
}

.pill--active {
  background: var(--color-card);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  font-weight: 600;
}

/* 导出印章按钮 */
.seal-btn {
  --el-button-bg-color: var(--color-accent);
  --el-button-border-color: var(--color-accent);
  --el-button-hover-bg-color: var(--color-accent-hover);
  --el-button-hover-border-color: var(--color-accent-hover);
  --el-button-active-bg-color: var(--color-accent-hover);
}

.seal-btn:active .seal-btn-inner {
  animation: seal-stamp 0.4s ease;
}

.seal-btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.seal-char {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  display: inline-block;
}

/* 导出时间戳 */
.export-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}

/* ═══ 表格样式 ═══ */
.el-table {
  --el-table-border-color: var(--color-border);
  --el-table-header-bg-color: var(--color-bg-subtle, #EDE9E0);
  --el-table-header-text-color: var(--color-text);
  --el-table-row-hover-bg-color: var(--color-accent-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.el-table :deep(th.el-table__cell) {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.el-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.code-cell {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  background: var(--color-accent-subtle);
  padding: 2px 8px;
  border-radius: 4px;
}

.name-cell {
  font-weight: 500;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.score-cell {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 15px;
  color: var(--color-accent);
  letter-spacing: -0.3px;
}

.score-cell--final {
  color: var(--color-jade);
}

.score-cell--draft {
  color: #3A7AB5;
}

/* 状态标签 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
  line-height: 1.3;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge--0  { background: #F5F5F5; color: #999; }
.status-badge--0  .status-dot { background: #BBB; }
.status-badge--1  { background: #EBF3FA; color: #3A7AB5; }
.status-badge--1  .status-dot { background: #3A7AB5; }
.status-badge--2  { background: #E8F5EE; color: #2E7D5B; }
.status-badge--2  .status-dot { background: #2E7D5B; }
.status-badge--\-1 { background: #F0F0F0; color: #AAA; }
.status-badge--\-1 .status-dot { background: #CCC; }
.status-badge--\-2 { background: #FFF0ED; color: #C0392B; }
.status-badge--\-2 .status-dot { background: #C0392B; }
.status-badge--\-3 { background: #F0EDF5; color: #7B6FA0; }
.status-badge--\-3 .status-dot { background: #7B6FA0; }

/* 表格底部 */
.table-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0;
  border-top: 1px solid var(--color-border-light);
  margin-top: 4px;
}

.table-footer-text {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
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
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .table-toolbar-right { width: 100%; justify-content: flex-end; }
}

@media (max-width: 768px) {
  .export-header { padding: 0 16px; }
  .export-body { padding: 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-num { font-size: 26px; }
  .stat-body { padding: 14px 12px; }

  .table-card { padding: 16px 14px 0; border-radius: var(--radius-md); }
  .table-toolbar { flex-direction: column; align-items: flex-start; }
  .table-toolbar-right { width: 100%; }
  .filter-pills { flex: 1; }
  .pill { flex: 1; text-align: center; }
  .seal-btn { width: 100%; justify-content: center; }

  .header-role { display: none; }
  .header-divider { display: none; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-num { font-size: 22px; }
  .bg-watermark { display: none; }
  .app-footer { padding: 10px 0; }
  .footer-text { font-size: 11px; }
}
</style>
