<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import { fetchExpertPrograms, saveScores, submitScores, fetchSchools } from './ScoringView.js'

const router = useRouter()
const auth = useAuthStore()
const store = useScoreStore()

const page = ref(1)
const limit = ref(10)
const tabActive = ref('all')
const multipleTableRef = ref()
const sidebarOpen = ref(false)
const isTablet = ref(false)

/* 控制分数列的输入框切换 */
const editingCode = ref<string | null>(null)

/* 学校模糊搜索下拉候选 */
const schoolOptions = ref<{ id: number; school_name: string }[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function searchSchools(keyword: string) {
  if (!keyword) {
    schoolOptions.value = []
    return
  }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetchSchools(keyword)
      schoolOptions.value = (res.data ?? []).slice(0, 50)
    } catch {
      schoolOptions.value = []
    }
  }, 300)
}

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
  [() => store.keyword, () => store.filterStatus, () => store.school],
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

function onSelectionChange(selection: ProgramWithScore[]) {
  store.selectedCodes = selection.map(s => s.code)
}

function startEdit(row: ProgramWithScore) {
  editingCode.value = row.code
  if (row.status === 1 && row.score !== null && row.score !== undefined) {
    store.editingScores[row.code] = row.score
  }
}

function checkSelectable(row: ProgramWithScore): boolean {
  // status 0: 编辑中的分数必须有效且 > 0; status 1: 已有保存的分数且 > 0
  if (row.status === 0) {
    const s = store.editingScores[row.code]
    return s !== null && s !== undefined && s > 0 && s <= 100
  }
  if (row.status === 1) return row.score !== null && row.score !== undefined && row.score > 0
  return false
}

async function reloadPrograms() {
  try {
    const { list, total: totalCount } = await fetchExpertPrograms({
      limit: 100,
      school_name: store.school || undefined,
    })
    store.setPrograms(list)
    total.value = totalCount
    filterData()
  } catch { /* 拦截器已弹提示 */ }
}

async function onScoreBlur(row: ProgramWithScore) {
  editingCode.value = null
  const val = store.editingScores[row.code]
  if (val === null || val === undefined) return
  // 失焦后自动保存
  await saveScores({ items: [{ program_id: row.id as number, score: val }] })
  ElMessage.success('已保存：' + row.name + ' ' + val + '分')
  // 重新拉取列表，同步后端最新状态
  await reloadPrograms()
}

async function submitAllSelected() {
  const table = multipleTableRef.value
  if (!table) return
  const selected = table.getSelectionRows() as ProgramWithScore[]
  if (selected.length === 0) {
    return ElMessage.warning('请先勾选要提交的项目')
  }
  // 只提交有效的（有分数的）
  const items: { program_id: number; score: number }[] = []
  selected.forEach(row => {
    if (row.status === 0) {
      const s = store.editingScores[row.code]
      if (s !== null && s !== undefined) {
        items.push({ program_id: row.id, score: Number(s) })
      }
    } else if (row.status === 1) {
      items.push({ program_id: row.id, score: row.score! })
    }
  })
  if (items.length === 0) {
    return ElMessage.warning('所选项目中没有可提交的分数')
  }
  ElMessageBox.confirm(
    `确认提交 ${items.length} 个节目的评分吗？提交后不可修改。`,
    '批量提交',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
  ).then(async () => {
    await submitScores({ items })
    items.forEach(it => {
      const row = store.allPrograms.find(p => p.id === it.program_id)
      if (row) store.submitToFinal(row.code)
    })
    ElMessage.success(`已提交 ${items.length} 个评分`)
    total.value = filterData()
  }).catch(() => {})
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
  await reloadPrograms()
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
        <div class="search-area">
          <el-form :model="store" class="search-form" label-width="90px">
            <el-row :gutter="24">
              <el-col :span="6">
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
          <el-col :span="5">
            <el-form-item label="参赛学校" prop="school">
            <el-select
              v-model="store.school"
              placeholder="学校名称模糊搜索"
              clearable
              filterable
              remote
              :remote-method="searchSchools"
              :suffix-icon="Search"
              class="search-input"
              @change="refresh"
            >
              <el-option
                v-for="item in schoolOptions"
                :key="item.id"
                :label="item.school_name"
                :value="item.school_name"
              />
            </el-select>
          </el-form-item>
          </el-col>
          <el-col :span="5">
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
          <div >
              <el-button type="primary" @click="submitAllSelected" class="submit-btn">提交</el-button>
            </div>
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
                :selectable="checkSelectable"
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
                min-width="180"
              >
                <template #default="{ row }">
                  <span class="program-name">{{ row.type }}</span>
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
                  <div class="score-cell">
                    <!-- 草稿(0) / 暂存(1): 点击切换输入/显示，失焦自动保存 -->
                    <template v-if="row.status === 0 || row.status === 1">
                      <el-input
                        v-if="editingCode === row.code"
                        ref="scoreInputRef"
                        v-model.number="store.editingScores[row.code]"
                        size="small"
                        placeholder="输入分数"
                        controls-position="right"
                        @blur="onScoreBlur(row)"
                      />
                      <span
                        v-else
                        class="score-text"
                        @click="startEdit(row)"
                      >
                        {{ (store.editingScores[row.code] || row.score) ? (store.editingScores[row.code] || row.score) + '分' : '点击输入' }}
                      </span>
                    </template>
                    <span v-else-if="row.status === 2" class="score-submitted">{{ row.score }}{{ row.score ? '分' : '' }}</span>
                    <!-- 无需评分(-1) -->
                    <span v-else>—</span>
                  </div>
                </template>
              </el-table-column>
              <!-- 操作列 -->
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

/* 勾选列 — 表头与行复选框左右对齐（:deep 写在组件内确保被 Vue 编译器正确处理） */
/* 消除 main.css `td:first-child { padding-left: 12px }` 对勾选列的干扰 */
:deep(.el-table__body-wrapper .el-table__row > td.el-table-column--selection:first-child) {
  padding-left: 0 !important;
}
:deep(.el-table .el-table-column--selection .cell) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 !important;
}
:deep(.el-table .el-table-column--selection .el-checkbox) {
  margin: 0 !important;
}
:deep(.el-table .el-table-column--selection .el-checkbox__input) {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
