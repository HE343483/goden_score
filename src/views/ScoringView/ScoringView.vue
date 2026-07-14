<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import { fetchExpertPrograms, saveScores, submitScores } from './ScoringView.js'

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
  else if (tab.props.name === 'unscored') store.filterStatus = 0
  else if (tab.props.name === 'draft') store.filterStatus = 1
  else if (tab.props.name === 'submitted') store.filterStatus = 2
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
      scores[d.code] = d.score ?? 0
    }
  })
  store.editingScores = { ...scores, ...store.editingScores }
}, { immediate: true })

async function submitScore(row: ProgramWithScore) {
  const score = store.editingScores[row.code]
  if (score === null || score === undefined) {
    return ElMessage.error('请输入分数')
  }
  if (score < 0 || score > 100) {
    return ElMessage.error('分数应在 0-100 之间')
  }
  await saveScores([{ program_id: row.id, score: Number(score) }])
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

async function submitSingle(row: ProgramWithScore) {
  ElMessageBox.confirm(
    `确认提交「${row.name}」的评分吗？提交后不可修改，分数为 ${row.score} 分。`,
    '确认提交',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
  ).then(async () => {
    await submitScores([{ program_id: row.id, score: row.score }])
    store.submitToFinal(row.code)
    ElMessage.success('提交成功：' + row.name)
    total.value = filterData()
  }).catch(() => {})
}
function onSelectionChange(selection: ProgramWithScore[]) {
  store.selectedCodes = selection.map(s => s.code)
}

async function logout() {
  const ok = await auth.logout()
  if (ok) router.push('/')
}
function getStatusText(status: number): string {
  switch (status) {
    case 0:   return '未评分'
    case 1:   return '已保存'
    case 2:   return '已提交'
    case -1:  return '无需评分'
    default:  return '—'
  }
}

function statusClass(status: number): string {
  const map: Record<number, string> = {
    0: 'unreviewed',
    1: 'draft',
    2: 'submitted',
    [-1]: 'noscore',
  }
  return map[status] ?? 'empty'
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

onMounted(async () => {
  store.loading = true
  try {
    const { list, total: totalCount } = await fetchExpertPrograms({ limit: 100 })
    store.setPrograms(list)
    total.value = totalCount
    filterData()
  } catch {
    // 拦截器已弹提示
  }
  checkScreen()
  window.addEventListener('resize', checkScreen)
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
          <span class="top-header-role">{{ auth.isReviewer ? '评审专家' : '管理员' }}</span>
          <span class="name-divider">|</span>
          <span class="user-name">{{ auth.userName }}</span>
          <button class="logout-btn" @click="logout">
            退出登录
          </button>
        </div>
      </header>

      <!-- 内容区 -->
      <div class="content-area">
        <!-- 工具栏 -->
        <div class="toolbar search-area">
          <el-form :model="store" class="search-form" label-width="90px">
            <el-row :gutter="29" min-width="1200px">
              <el-col :span="8">
            <el-form-item label="节目编码" prop="keyword" >
            <el-input
              width="100%"
              v-model="store.keyword"
              placeholder="搜索节目编码"
              clearable
              class="search-input"
            />
          </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="节目名称" prop="filterName">
            <el-input
              v-model="store.filterName"
              placeholder="搜索节目名称"
              clearable
              class="search-input"
              @change="refresh"
            />
          </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态" prop="filterStatus">
            <el-select
              v-model="store.filterStatus"
              placeholder="全部状态"
              clearable
              class="status-select"
              @change="refresh"
              @clear="store.filterStatus = null"
            >
              <el-option :value="null" label="全部状态" />
              <el-option :value="0" label="未评分" />
              <el-option :value="1" label="已评分" />
              <el-option :value="2" label="已提交" />
              <el-option :value="-1" label="无需评分" />
            </el-select>
          </el-form-item>
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
              <el-tab-pane label="未评分" name="unscored" />
              <el-tab-pane label="已保存" name="draft" />
              <el-tab-pane label="已提交" name="submitted" />
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
                width="170"
              >
                <template #default="{ row }">
                  <code class="code-text">{{ row.code }}</code>
                </template>
              </el-table-column>
              <el-table-column
                header-align="center"
                align="center"
                label="参展学校"
                min-width="180"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.school }}</span>
                </template>
              </el-table-column>
              <el-table-column
                header-align="center"
                align="center"
                label="节目类型"
                min-width="350"
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
              <el-table-column
                header-align="center"
                align="center"
                label="分数"
                min-width="100"
              >
                <template #default="{ row }">
                  <!-- 草稿(0): 可编辑 -->
                  <el-input
                    v-if="row.status === 0"
                    v-model.number="store.editingScores[row.code]"
                    size="small"
                    placeholder="输入分数"
                    controls-position="right"
                  />
                  <!-- 暂存(1) / 已提交(2): 只读 -->
                  <span v-else-if="row.status === 1 || row.status === 2">{{ row.score }}{{ row.score ? '分' : '' }}</span>
                  <!-- 无需评分(-1) -->
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <!-- 操作列 -->
              <el-table-column
                header-align="center"
                align="center"
                label="操作"
                min-width="180"
                fixed="right"
              >
                <template #default="{ row }">
                  <!-- status 0: 未评分 → 可评分 / 弃赛 -->
                  <div v-if="row.status === 0" class="score-ops">
                    <el-button
                      type="success"
                      link
                      :disabled="store.editingScores[row.code] === null || store.editingScores[row.code] === undefined"
                      @click="submitScore(row)"
                      size="small"
                    >
                      评分
                    </el-button>
                    <el-button
                      link
                      size="small"
                      type="danger"
                      @click="markAbandoned(row)"
                    >
                      弃赛
                    </el-button>
                  </div>

                  <!-- status 1: 已保存 → 可提交 / 重评 -->
                  <div v-else-if="row.status === 1" class="score-ops">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="submitSingle(row)"
                    >
                      提交
                    </el-button>
                    <el-button text bg size="small" class="rescore-el-btn" @click="requestRescore(row)">
                      重评
                    </el-button>
                  </div>

                  <!-- status 2: 已提交 -->
                  <span v-else-if="row.status === 2" class="status-badge status-badge--submitted">✓ 已提交</span>

                  <!-- status -1: 无需评分 -->
                  <span v-else-if="row.status === -1" class="status-badge status-badge--noscore">无需评分</span>
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
@import './ScoringView.css';
</style>
