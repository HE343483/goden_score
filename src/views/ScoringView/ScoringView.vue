<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'

const router = useRouter()
const auth = useAuthStore()
const store = useScoreStore()

const page = ref(1)
const limit = ref(10)
const tabActive = ref('all')
const multipleTableRef = ref()
const sidebarOpen = ref(false)
const isTablet = ref(false)

const paginatedData = ref<ProgramWithScore[]>([])

function checkScreen() {
  isTablet.value = window.innerWidth <= 1024
  if (!isTablet.value) sidebarOpen.value = false
}

function filterData() {
  const list = store.filteredPrograms
  const start = (page.value - 1) * limit.value
  paginatedData.value = list.slice(start, start + limit.value)
  return list.length
}

const total = ref(0)

function refresh() {
  page.value = 1
  total.value = filterData()
}

function handleTabClick(tab: { props: { name: string } }) {
  page.value = 1
  if (tab.props.name === 'all') store.filterStatus = null
  else if (tab.props.name === 'unreviewed') store.filterStatus = 0
  else if (tab.props.name === 'reviewed') store.filterStatus = 1
  total.value = filterData()
}

function handleSizeChange(val: number) {
  limit.value = val
  page.value = 1
  total.value = filterData()
}

function handleCurrentChange(val: number) {
  page.value = val
  total.value = filterData()
}

watch(
  [() => store.keyword, () => store.filterStatus],
  () => { refresh() }
)

watch(paginatedData, (list) => {
  const scores: Record<string, number> = {}
  list.forEach(d => {
    if (d.status === 0) {
      scores[d.code] = d.score ?? 80
    }
  })
  store.editingScores = { ...scores, ...store.editingScores }
}, { immediate: true })

function submitScore(row: ProgramWithScore) {
  const score = store.editingScores[row.code]
  if (score === null || score === undefined) {
    return ElMessage.error('请输入分数')
  }
  if (score < 0 || score > 100) {
    return ElMessage.error('分数应在 0-100 之间')
  }
  store.submitScore(row.code, Number(score))
  ElMessage.success(`评分成功：${Number(score).toFixed(1)} 分`)
  total.value = filterData()
}

function markAbandoned(row: ProgramWithScore) {
  ElMessageBox.confirm(
    `确定将 "${row.name}" 标记为弃赛吗？`,
    '弃赛确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    store.markAbandoned(row.code)
    ElMessage.success('已标记为弃赛')
    total.value = filterData()
  }).catch(() => {})
}

function requestRescore(row: ProgramWithScore) {
  ElMessageBox.confirm(
    '确定重新评分吗？当前评分将被打回，需要重新评审。',
    '重新评分',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    store.requestRescore(row.code)
    ElMessage.success('已申请重新评分，请重新评审')
    total.value = filterData()
  }).catch(() => {})
}

function submitSingle(row: ProgramWithScore) {
  ElMessageBox.confirm(
    `确认提交「${row.name}」的评分吗？提交后不可修改。`,
    '确认提交',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
  ).then(() => {
    store.submitToFinal(row.code)
    ElMessage.success('提交成功：' + row.name)
    total.value = filterData()
  }).catch(() => {})
}
function onSelectionChange(selection: ProgramWithScore[]) {
  store.selectedCodes = selection.map(s => s.code)
}

function logout() {
  auth.logout()
  router.push('/')
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

function getStatusText(status: number): string {
  switch (status) {
    case 0:   return '未评'
    case 1:   return '已评'
    case 2:   return '已提交'
    case -1:  return '无需评分'
    case -2:  return '弃赛'
    case -3:  return '回避'
    default:  return '—'
  }
}

function statusClass(status: number): string {
  const map: Record<number, string> = {
    0: 'unreviewed',
    1: 'reviewed',
    2: 'submitted',
    [-1]: 'noscore',
    [-2]: 'abandoned',
    [-3]: 'avoid',
  }
  return map[status] ?? 'empty'
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

onMounted(() => {
  checkScreen()
  window.addEventListener('resize', checkScreen)
  total.value = filterData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreen)
})
</script>

<template>
  <div class="scoring-layout">
    <!-- 平板端侧栏遮罩 -->
    <div
      v-if="isTablet && sidebarOpen"
      class="sidebar-backdrop"
      @click="closeSidebar"
    ></div>

    <!-- 侧栏 -->
    <aside
      class="sidebar"
      :class="{ 'sidebar--open': sidebarOpen }"
    >
      <div class="sidebar-brand">
        <el-image
          src="/logo.png"
          class="sidebar-seal" />
        <div class="sidebar-brand-text">
          <span class="sidebar-title">评分系统</span>
          <span class="sidebar-subtitle">艺术展演</span>
        </div>
      </div>

      <el-menu
        :default-active="'scoring'"
        class="sidebar-menu"
        background-color="#FFFFFF"
        text-color="#6B6B7B"
        active-text-color="#D94444"
      >
        <el-menu-item index="scoring">
          <template #title>
            <span class="menu-item-inner">
              <span class="menu-icon">▣</span>
              <span>评分管理</span>
            </span>
          </template>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-tips">
        <div class="tip-line">评委，您好！</div>
        <div class="tip-line">欢迎您参加项目的评审工作，请您按照评委守则的要求认真履责，按照评分标准的要求准确赋分，共同营造公平、公正、和谐的展赛氛围，做好学生成长的引路人。</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <header class="top-header">
        <div class="top-header-left">
          <button class="hamburger-btn" @click="toggleSidebar" aria-label="切换侧栏">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
          <span class="header-dot"></span>
          <h1 class="header-title">评分管理</h1>
        </div>
        <div class="top-header-right">
          <span class="top-header-role">{{ auth.isExpert ? '评审专家' : '管理员' }}</span>
          <span class="name-divider">|</span>
          <span class="user-name">{{ auth.userName }}</span>
          <button class="logout-btn" @click="logout">
            退出
          </button>
        </div>
      </header>

      <!-- 内容区 -->
      <div class="content-area">
        <!-- 工具栏 -->
        <div class="toolbar search-area">
          <el-form :model="store" class="search-form" label-width="90px">
            <el-row :gutter="24">
              <el-col :span="7">
            <el-form-item label="节目编码" prop="keyword">
            <el-input
              v-model="store.keyword"
              placeholder="搜索节目编码"
              clearable
              class="search-input"
            />
          </el-form-item>
          </el-col>
          <el-col :span="7">
            <el-form-item label="节目名称" prop="keyword">
            <el-input
              v-model="store.keyword"
              placeholder="搜索节目名称"
              clearable
              class="search-input"
            />
          </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态" prop="filterStatus">
            <el-select
              v-model="store.filterStatus"
              placeholder="全部状态"
              clearable
              class="status-select"
              @change="refresh"
            >
              <el-option :value="null" label="全部状态" />
              <el-option :value="0" label="未评分" />
              <el-option :value="1" label="已评分" />
              <el-option :value="2" label="已提交" />
              <el-option :value="-1" label="无需评分" />
            </el-select>
          </el-form-item>
          </el-col>
          <el-col :span="1">
            <el-button type="primary" @click="refresh">搜索</el-button>
          </el-col>
            </el-row>
          </el-form>
        </div>

        <!-- 评分列表 -->
        <div class="content-card">
          <div class="content-header-row">
            <div class="content-header-left">
              <h2 class="section-title">评分列表</h2>
              <span class="section-count">{{ total }} 项</span>
            </div>
            <el-tabs
              :model-value="tabActive"
              @tab-click="handleTabClick"
              class="content-tabs"
            >
              <el-tab-pane label="全部" name="all" />
              <el-tab-pane label="未评" name="unreviewed" />
              <el-tab-pane label="已评" name="reviewed" />
            </el-tabs>
          </div>

          <!-- 表格 -->
          <div class="table-wrapper">
            <el-table
              ref="multipleTableRef"
              :data="paginatedData"
              border
              size="small"
              style="width:100%"
              @selection-change="onSelectionChange"
              row-key="code"
            >
              <el-table-column
                type="selection"
                width="44"
                header-align="center"
                align="center"
              />

              <el-table-column
                header-align="center"
                align="center"
                label="序号"
                type="index"
                width="46"
              />

              <el-table-column
                header-align="center"
                align="center"
                label="项目编码"
                width="145"
              >
                <template #default="{ row }">
                  <code class="code-text">{{ row.code }}</code>
                </template>
              </el-table-column>
              <el-table-column
                header-align="center"
                align="center"
                label="参展学校"
                min-width="150"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.school }}</span>
                </template>
              </el-table-column>
              <el-table-column
                header-align="center"
                align="center"
                label="节目类型"
                min-width="150"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.type }}</span>
                </template>
              </el-table-column>
              <el-table-column
                header-align="center"
                align="center"
                label="组别"
                min-width="150"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.group }}</span>
                </template>
              </el-table-column>

              <el-table-column
                header-align="center"
                align="center"
                label="参展项目"
                min-width="150"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.name }}</span>
                </template>
              </el-table-column>

              <el-table-column
                header-align="center"
                align="center"
                label="状态"
                width="100"
              >
                <template #default="{ row }">
                  <span :class="['status-tag', `status-tag--${statusClass(row.status)}`]">
                    <span class="status-dot"></span>
                    {{ getStatusText(row.status) }}
                  </span>
                </template>
              </el-table-column>

              <!-- 分数 / 操作列 -->
              <el-table-column
                header-align="center"
                align="center"
                label="操作"
                min-width="180"
                fixed="right"
              >
                <template #default="{ row }">
                  <!-- 未评分：输入框 + 印章按钮 -->
                  <div v-if="row.status === 0" class="score-ops">
                    <el-input-number
                      v-model="store.editingScores[row.code]"
                      :min="0"
                      :max="100"
                      :precision="1"
                      :step="0.5"
                      size="small"
                      class="score-input"
                      controls-position="right"
                    />
                    <el-button
                      type="success"
                      link
                      :icon="View"
                      :disabled="store.editingScores[row.code] === null || store.editingScores[row.code] === undefined"
                      @click="submitScore(row)"
                      title="评分"
                      size="small"
                    >
                      评分
                    </el-button>
                    <el-button
                    :icon="View"
                    link
                    size="small"
                    type="danger"
                    @click="markAbandoned(row)"
                    >
                      弃赛
                    </el-button>
                  </div>

                  <!-- 已评分：分数 + 提交印章 -->
                  <div v-else-if="row.status === 1" class="score-ops">
                    <span class="score-value">{{ formatScore(row.score) }}</span>
                    <el-button
                      type="primary"
                      link
                      :icon="Submit"
                      size="small"
                      @click="submitSingle(row)"
                      title="提交至终审"
                    >
                      提交
                    </el-button>
                    <el-button text bg size="small" class="rescore-el-btn" @click="requestRescore(row)">
                      重评
                    </el-button>
                  </div>

                  <!-- 已提交：只读，显示分数 + 状态标签 -->
                  <div v-else-if="row.status === 2" class="score-ops">
                    <span class="score-value score-value--final">{{ formatScore(row.score) }}</span>
                    <span class="status-badge status-badge--submitted">✓ 已提交</span>
                  </div>

                  <!-- 弃赛 / 同校回避 -->
                  <span v-else-if="row.status === -2" class="status-badge status-badge--abandoned" >✕ 弃赛</span>
                  <span v-else-if="row.status === -3" class="status-badge status-badge--avoid">○ 回避</span>
                  <span v-else-if="row.status === -1" class="status-badge status-badge--noscore">— 无需评分</span>
                  <span v-else class="status-badge status-badge--empty">—</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <el-pagination
            class="my-pagination"
            :current-page="page"
            :page-sizes="[10, 20, 50, 100]"
            :page-size="limit"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 页脚 -->
      <footer class="app-footer">
        <span class="footer-text">@copyright 四川省大学生艺术展演 · 评分系统</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/*布局 */
.scoring-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 侧栏 */
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--color-sidebar);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.sidebar-seal {
  width: 36px;
  height: 36px;
  border-radius: 16px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: var(--color-card);
}

.sidebar-brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sidebar-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 2px;
  white-space: nowrap;
  line-height: 1.3;
}

.sidebar-subtitle {
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 3px;
}

.sidebar-menu {
  border-right: none !important;
  flex: 0 0 auto;
  padding-top: 6px;
}

.sidebar-menu .el-menu-item {
  font-size: 14px;
  letter-spacing: 0.5px;
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: var(--radius-sm);
  width: auto;
  transition: all 0.2s;
}

.sidebar-menu .el-menu-item:hover {
  background-color: var(--color-sidebar-hover) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(90deg, var(--color-accent-light) 0%, transparent 100%) !important;
  position: relative;
}

.sidebar-menu .el-menu-item.is-active::after {
  content: '';
  position: absolute;
  right: 0;
  top: 20%;
  bottom: 20%;
  width: 3px;
  background: var(--color-accent);
  border-radius: 2px 0 0 2px;
}

.menu-item-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-icon {
  font-size: 13px;
  opacity: 0.6;
}

.sidebar-info {
  padding: 16px 20px;
  margin-top: auto;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.info-label {
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.info-value {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}

.sidebar-tips {
  padding: 14px 20px;
  border-top: 1px solid var(--color-border-light);
}

.tip-line {
  font-size: 15px;
  line-height: 1.8;
}

/* 侧栏遮罩（平板端） */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
  background: rgba(0,0,0,0.35);
  animation: fade-in 0.2s ease;
}

/* 主区域 */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
  min-width: 0;
}

.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: 12px;
}

.top-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.5px;
  min-width: 0;
}

.header-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-accent);
  flex-shrink: 0;
}

.header-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 4px;
  transition: background 0.15s;
}

.hamburger-btn:hover {
  background: var(--color-accent-light);
}

.hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  border-radius: 1px;
  background: var(--color-text);
}

.top-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.top-header-role {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.name-divider {
  color: var(--color-border);
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
  white-space: nowrap;
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

/* 内容区*/
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 18px 24px;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.search-area {
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 210px;
}

.search-icon {
  font-size: 15px;
  opacity: 0.5;
}

.status-select {
  width: 130px;
}

.selected-count {
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ═══ 列表卡片 ═══ */
.content-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: 20px 20px 16px;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
  min-width: 0;
}

.content-card:hover {
  box-shadow: var(--shadow-md);
}

.content-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.content-header-left {
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

.content-tabs {
  margin-bottom: 0;
}

/* ═══ 表格容器 ═══ */
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 -4px;
  padding: 0 4px;
  border-radius: var(--radius-md);
  scrollbar-width: auto;
  scrollbar-color: #c0c0c0 #f0f0f0;
  min-width: 0;
}

.table-wrapper::-webkit-scrollbar {
  height: 6px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 5px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #c0c0c0;
  border-radius: 5px;
  border: 2px solid #f0f0f0;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #999;
}

.code-text {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
  background: var(--color-accent-subtle);
  padding: 2px 8px;
  border-radius: 4px;
}

.program-name {
  font-weight: 500;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.cat-tag {
  font-size: 12.5px;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.group-tag {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

/*评分操作 */
.score-ops {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.score-input {
  width: 124px;
}

.score-input :deep(.el-input__inner) {
  font-size: 14px;
  text-align: center;
  font-weight: 600;
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.score-value {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 17px;
  color: var(--color-accent);
  min-width: 56px;
  display: inline-block;
  text-align: center;
  letter-spacing: -0.5px;
}

.score-value--final {
  color: var(--color-jade);
}

/*基础按钮样式*/
.rescore-el-btn {
  font-size: 12px;
  letter-spacing: 0.3px;
}

.rescore-el-btn:hover {
  color: var(--color-gold) !important;
}

/* ═══ 状态标签（操作列） ═══ */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.status-badge--submitted {
  background: #E8F5EE;
  color: #2E7D5B;
}

.status-badge--abandoned {
  background: #FFF0ED;
  color: #C0392B;
}

.status-badge--avoid {
  background: #F0EDF5;
  color: #7B6FA0;
}

.status-badge--noscore {
  background: #F5F5F5;
  color: #999;
}

.status-badge--empty {
  color: var(--color-text-muted);
  padding: 0;
}

/* ═══ 状态标签（状态列） ═══ */
.status-tag {
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

/* 未评 — 灰色 */
.status-tag--unreviewed {
  background: #F5F5F5;
  color: #999;
}
.status-tag--unreviewed .status-dot {
  background: #BBB;
}

/* 已评 — 蓝色 */
.status-tag--reviewed {
  background: #EBF3FA;
  color: #3A7AB5;
}
.status-tag--reviewed .status-dot {
  background: #3A7AB5;
}

/* 已提交 — 绿色 */
.status-tag--submitted {
  background: #E8F5EE;
  color: #2E7D5B;
}
.status-tag--submitted .status-dot {
  background: #2E7D5B;
}

/* 无需评分 — 灰色 */
.status-tag--noscore {
  background: #F0F0F0;
  color: #AAA;
}
.status-tag--noscore .status-dot {
  background: #CCC;
}

/* 弃赛 — 红色 */
.status-tag--abandoned {
  background: #FFF0ED;
  color: #C0392B;
}
.status-tag--abandoned .status-dot {
  background: #C0392B;
}

/* 回避 — 紫色 */
.status-tag--avoid {
  background: #F0EDF5;
  color: #7B6FA0;
}
.status-tag--avoid .status-dot {
  background: #7B6FA0;
}

/* 兜底 */
.status-tag--empty {
  background: transparent;
  color: #CCC;
  padding: 0;
}
.status-tag--empty .status-dot {
  display: none;
}

/*分页*/
.my-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

/*页脚*/
.app-footer {
  flex-shrink: 0;
  text-align: center;
  padding: 10px 0;
  background: var(--color-card);
  border-top: 1px solid var(--color-border-light);
}

.footer-text {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

/* 自适应 — 1200px 以下 */
@media (max-width: 1200px) {
  .top-header { padding: 0 18px; }
  .content-area { padding: 16px 18px; }
  .search-input { width: 170px; }
  .status-select { width: 120px; }
}

/*自适应 — 1024px 以下（平板横屏） */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(0,0,0,0.18);
  }
  .sidebar--open { transform: translateX(0); }

  .hamburger-btn { display: flex; }

  .top-header { padding: 0 14px; height: 48px; }
  .header-title { font-size: 15px; }

  .content-area { padding: 14px 14px; }
  .toolbar { gap: 8px; margin-bottom: 14px; }
  .toolbar-left { gap: 6px; }
  .toolbar-right { gap: 6px; }
  .search-input { width: 150px; }
  .status-select { width: 110px; }

  .content-card { padding: 16px 14px 14px; }

  .my-pagination :deep(.el-pager li) {
    min-width: 28px;
    font-size: 12px;
  }
  .my-pagination :deep(.btn-prev),
  .my-pagination :deep(.btn-next) {
    min-width: 28px;
  }
}

/*自适应 — 768px 以下（平板竖屏 / 手机）*/
@media (max-width: 768px) {
  .top-header { padding: 0 12px; height: 46px; }
  .top-header-left { font-size: 14px; gap: 6px; }
  .top-header-right { gap: 8px; }
  .top-header-role { display: none; }
  .name-divider { display: none; }
  .user-name { font-size: 13px; }

  .content-area { padding: 10px 12px; }

  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-left { flex: 1; flex-wrap: wrap; }
  .toolbar-right { justify-content: flex-end; }
  .search-input { width: 100%; min-width: 0; }
  .status-select { width: 100%; min-width: 0; }

  .content-card { padding: 12px 12px 12px; border-radius: var(--radius-md); }

  .section-title { font-size: 16px; }

  .score-input { width: 110px; }

  .my-pagination { justify-content: center; }
  .my-pagination :deep(.el-pagination__sizes) { display: none; }

  .app-footer { padding: 8px 0; }
  .footer-text { font-size: 11px; }
}
</style>
