<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import ExportDialog from './comment/ExportDialog.vue'

const router = useRouter()
const auth = useAuthStore()
const store = useScoreStore()

const activeTab = ref('all')
const exporting = ref(false)

/* 大类 / 报名类型 联动筛选 */
const majorCategoryFilter = ref('')
const subCategoryFilter = ref('')

/* ── 静态分类筛选面板 ── */
interface CatLeaf {
  label: string
  keyword: string
}
interface CatGroup {
  label: string
  teamType?: string        /* 集体 / 个人 */
  children: CatLeaf[]
}
const CATEGORY_TREE: CatGroup[] = [
  {
    label: '艺术表演类（集体项目）',
    teamType: '集体',
    children: [
      { label: '声乐作品报名', keyword: '声乐' },
      { label: '器乐作品报名', keyword: '器乐' },
      { label: '舞蹈作品报名', keyword: '舞蹈' },
      { label: '戏剧（戏曲）作品报名', keyword: '戏剧' },
      { label: '朗诵作品报名', keyword: '朗诵' },
    ],
  },
  {
    label: '艺术表演类（个人项目）',
    teamType: '个人',
    children: [
      { label: '声乐作品报名', keyword: '声乐' },
      { label: '器乐作品报名', keyword: '器乐' },
      { label: '舞蹈作品报名', keyword: '舞蹈' },
      { label: '戏曲作品报名', keyword: '戏曲' },
      { label: '朗诵作品报名', keyword: '朗诵' },
    ],
  },
  {
    label: '学生艺术作品类',
    children: [
      { label: '绘画作品报名', keyword: '绘画' },
      { label: '书法作品报名', keyword: '书法' },
      { label: '篆刻作品报名', keyword: '篆刻' },
      { label: '摄影作品报名', keyword: '摄影' },
      { label: '设计作品报名', keyword: '设计' },
      { label: '影视作品报名', keyword: '影视' },
    ],
  },
  {
    label: '高校校长作品类',
    children: [
      { label: '绘画作品报名', keyword: '绘画' },
      { label: '书法作品报名', keyword: '书法' },
      { label: '篆刻作品报名', keyword: '篆刻' },
      { label: '摄影作品报名', keyword: '摄影' },
    ],
  },
  {
    label: '艺术实践工作坊',
    children: [
      { label: '艺术实践工作坊', keyword: '工作坊' },
    ],
  },
  {
    label: '优秀成果申报',
    children: [
      { label: '优秀成果申报', keyword: '美育改革创新' },
    ],
  },
]

const expandedGroup = ref('')          /* 当前展开的分组 */
const catKeyword = ref('')            /* 分类关键词筛选 */
const catTeamType = ref('')          /* 集体/个人筛选 */
const catActiveLabel = ref('')       /* 当前选中的选项文字（用于高亮） */

/* 所有数据 */
const allData = computed(() => store.allPrograms)

/* 按大类 + 报名类型 + 状态标签 + 分类面板 过滤 */
const filteredData = computed(() => {
  let list = allData.value
  if (majorCategoryFilter.value) {
    list = list.filter(d => d.majorCategory === majorCategoryFilter.value)
  }
  if (subCategoryFilter.value) {
    list = list.filter(d => d.subCategory === subCategoryFilter.value)
  }
  /* 分类面板筛选 */
  if (catKeyword.value) {
    list = list.filter(d => d.name.includes(catKeyword.value))
  }
  if (catTeamType.value) {
    list = list.filter(d => d.teamType === catTeamType.value)
  }
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

/* ── 分页 ── */
const page = ref(1)
const pageSize = 20

const paginatedData = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

function handlePageChange(p: number) {
  page.value = p
}

/* 筛选条件变化时重置到第一页 */
watch(
  [catKeyword, catTeamType, activeTab, majorCategoryFilter, subCategoryFilter, () => store.keyword, () => store.school],
  () => { page.value = 1 }
)

function getStatusText(status: number): string {
  switch (status) {
    case 0:   return '未评分'
    case 1:   return '已评分'
    case 2:   return '已提交'
    case -1:  return '无需评分'
    case -2:  return '弃赛'
    default:  return '—'
  }
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

/* ── 分类面板交互 ── */
function toggleGroup(label: string) {
  expandedGroup.value = expandedGroup.value === label ? '' : label
}

function selectCatLeaf(group: CatGroup, leaf: CatLeaf) {
  catKeyword.value = leaf.keyword
  catTeamType.value = group.teamType || ''
  catActiveLabel.value = `${group.label}›${leaf.label}`
  expandedGroup.value = group.label
}

function clearCatFilter() {
  catKeyword.value = ''
  catTeamType.value = ''
  catActiveLabel.value = ''
  expandedGroup.value = ''
}

function refresh() {
  /* 搜索功能 — 响应式数据已自动触发 filteredData */
}

function getCatGroupCount(group: CatGroup): number {
  return allData.value.filter(d => {
    if (group.teamType && d.teamType !== group.teamType) return false
    return group.children.some(c => d.name.includes(c.keyword))
  }).length
}

function getCatLeafCount(leaf: CatLeaf): number {
  return allData.value.filter(d => d.name.includes(leaf.keyword)).length
}

/* ── 导出弹窗 ── */
const exportDialogVisible = ref(false)

function openExportDialog() {
  exportDialogVisible.value = true
}

function handleEdit(row: ProgramWithScore) {
  ElMessage.info(`查看项目：${row.code} ${row.name}`)
}

function handleDelete(row: ProgramWithScore) {
  if (row.status === -2) {
    store.requestRescore(row.code)
    ElMessage.success(`${row.code} 已恢复`)
  } else {
    store.markAbandoned(row.code)
    ElMessage.warning(`${row.code} 已标记为弃赛`)
  }
}

function handleSameSchool(row: ProgramWithScore) {
  if (row.status === -3) {
    store.requestRescore(row.code)
    ElMessage.success(`${row.code} 已恢复`)
  } else {
    store.markSameSchoolAvoid(row.code)
    ElMessage.warning(`${row.code} 已标记为同校弃赛`)
  }
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
        <span class="header-role">管理人员</span>
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
      <div class="search-area">
        <el-form label-width="100px">
          <el-row>
            <el-col :span="6">
          <el-form-item label="项目编码" prop="keyword">
            <div class="toolbar-search">
            <el-input
              v-model="store.keyword"
              placeholder="搜索项目名称或编码"
              clearable
              class="search-input"
            />
          </div>
          </el-form-item>
          </el-col>
          <el-col :span="4">
          <el-form-item label="学校" prop="school">
          <div class="toolbar-search">
            <el-input
              v-model="store.school"
              placeholder="搜索学校名称"
              clearable
              class="search-input"
            />
          </div>
          </el-form-item>
          </el-col>
          <el-form-item>
            <el-button type="primary" @click="refresh" style="margin-left: 40px;">搜索</el-button>
          </el-form-item>
          </el-row>
        </el-form>
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
              @click="openExportDialog"
            >
              <span v-if="!exporting" class="seal-btn-inner">
                <span>导出</span>
              </span>
              <span v-else>导出中…</span>
            </el-button>
          </div>
        </div>

        <!-- ═══ 分类筛选面板 ═══ -->
        <div class="category-filter">
          <div class="category-filter__header">
            <span class="category-filter__title">大小类区分</span>
            <span v-if="catActiveLabel" class="category-filter__clear" @click="clearCatFilter">清除筛选</span>
          </div>
          <div class="category-filter__body">
            <!-- 全部 -->
            <div
              :class="['cat-item', 'cat-item--all', { 'cat-item--active': !catActiveLabel }]"
              @click="clearCatFilter"
            >
              <span class="cat-item__name">全部</span>
              <span class="cat-item__count">{{ allData.length }}</span>
            </div>

            <!-- 遍历分组 -->
            <template v-for="group in CATEGORY_TREE" :key="group.label">
              <!-- 分组标题行（点击展开/收起） -->
              <div
                :class="['cat-item', 'cat-item--group', {
                  'cat-item--expanded': expandedGroup === group.label,
                }]"
                @click="toggleGroup(group.label)"
              >
                <span class="cat-item__arrow">
                  {{ expandedGroup === group.label ? '▾' : '▸' }}
                </span>
                <span class="cat-item__name">{{ group.label }}</span>
                <span class="cat-item__count">{{ getCatGroupCount(group) }}</span>
              </div>

              <!-- 子选项（展开时） -->
              <div v-if="expandedGroup === group.label" class="cat-subs">
                <div
                  v-for="leaf in group.children"
                  :key="leaf.label"
                  :class="['cat-sub', {
                    'cat-sub--active': catActiveLabel === `${group.label}›${leaf.label}`
                  }]"
                  @click="selectCatLeaf(group, leaf)"
                >
                  <span class="cat-sub__name">{{ leaf.label }}</span>
                  <span class="cat-sub__count">{{ getCatLeafCount(leaf) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 表格 -->
        <el-table
          :data="paginatedData"
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
          <el-table-column prop="school" label="学校" width="100" align="center" header-align="center" />
          <el-table-column prop="award" label="奖项" width="100" align="center" header-align="center" />
          <el-table-column label="状态" width="100" align="center" header-align="center">
            <template #default="{ row }">
              <span :class="['status-badge', `status-badge--${row.status}`]">
                <span class="status-dot"></span>
                {{ getStatusText(row.status) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center" header-align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="handleEdit(row)">查看</el-button>
              <el-button type="danger" size="small" link @click="handleDelete(row)">
                {{ row.status === -2 ? '恢复' : '弃赛' }}
              </el-button>
              <el-button type="warning" size="small" link @click="handleSameSchool(row)">
                {{ row.status === -3 ? '同校恢复' : '同校弃赛' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="table-pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="filteredData.length"
            layout="total, prev, pager, next"
            background
            small
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="app-footer">
      <span class="footer-text">© 四川省大学生艺术展演 · 评鉴录</span>
    </footer>
  </div>

  <!-- ═══ 导出弹窗（组件） ═══ -->
  <ExportDialog
    v-model:visible="exportDialogVisible"
    :category-tree="CATEGORY_TREE"
  />
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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
.search-area {
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}
.toolbar-search {
  flex-shrink: 0;
  width: 220px;
}
.search-input {
  width: 100%;
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

/* 表格底部 — 分页容器 */
.table-pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 4px;
  border-top: 1px solid var(--color-border-light);
  margin-top: 4px;
}

/* ═══ 分类筛选面板 ═══ */
.category-filter {
  margin-bottom: 14px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.category-filter__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border-light);
}

.category-filter__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  letter-spacing: 1px;
}

.category-filter__clear {
  font-size: 12px;
  color: var(--color-accent);
  cursor: pointer;
  letter-spacing: 0.3px;
  transition: opacity 0.2s;
}

.category-filter__clear:hover {
  opacity: 0.7;
}

.category-filter__body {
  padding: 4px 0;
  max-height: 400px;
  overflow-y: auto;
}

/* ── 所有项共用 ── */
.cat-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  gap: 8px;
  user-select: none;
  min-height: 32px;
}

.cat-item:hover {
  background: var(--color-accent-light);
}

.cat-item--active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
}

.cat-item__arrow {
  width: 16px;
  text-align: center;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.cat-item__name {
  flex: 1;
  font-size: 13px;
  letter-spacing: 0.3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-item__count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-bg-subtle);
  padding: 1px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  min-width: 26px;
  text-align: center;
}

.cat-item--active .cat-item__count {
  background: var(--color-accent);
  color: #fff;
}

/* ── 全部行 ── */
.cat-item--all {
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 2px;
}

.cat-item--all.cat-item--active {
  color: var(--color-text);
}

.cat-item--all.cat-item--active .cat-item__count {
  background: var(--color-text);
  color: #fff;
}

/* ── 子选项 ── */
.cat-subs {
  background: var(--color-bg);
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  animation: slide-down 0.2s ease;
}

.cat-sub {
  display: flex;
  align-items: center;
  padding: 5px 14px 5px 36px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  gap: 8px;
  user-select: none;
  min-height: 28px;
}

.cat-sub:hover {
  background: var(--color-accent-light);
}

.cat-sub--active {
  color: var(--color-accent);
  font-weight: 600;
  background: var(--color-accent-light);
}

.cat-sub__name {
  flex: 1;
  font-size: 12.5px;
  letter-spacing: 0.3px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-sub__count {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-card);
  padding: 1px 8px;
  border-radius: 10px;
  flex-shrink: 0;
  min-width: 26px;
  text-align: center;
}

.cat-sub--active .cat-sub__count {
  background: var(--color-accent);
  color: #fff;
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

/* ═══ 展开动画 ═══ */
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
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
