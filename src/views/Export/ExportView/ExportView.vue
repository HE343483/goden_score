<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import { fetchAdminPrograms, fetchAdminStats } from './ExportView.js'
import ExportDialog from './comment/ExportDialog.vue'
import DetailDialog from './comment/DetailDialog.vue'

const store = useScoreStore()

const activeTab = ref('all')
const exporting = ref(false)

/* ── 从 API 加载数据 ── */
const statsData = ref({
  total_programs: 0, pending: 0, partial: 0, completed: 0, exempt: 0,
})
onMounted(async () => {
  const [programsRes, statsRes] = await Promise.all([
    fetchAdminPrograms({ limit: 100 }),
    fetchAdminStats(),
  ])
  store.setPrograms(programsRes.list)
  statsData.value = statsRes
})

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

/* 按关键词 + 状态标签 + 分类面板 过滤 */
const filteredData = computed(() => {
  let list = allData.value
  /* 关键词搜索 — 后端已处理，这里做本地补充过滤 */
  if (store.keyword) {
    const kw = store.keyword.toLowerCase()
    list = list.filter(d => d.code.toLowerCase().includes(kw) || d.name.toLowerCase().includes(kw))
  }
  /* 学校筛选 */
  if (store.school) {
    const sw = store.school.toLowerCase()
    list = list.filter(d => d.school.toLowerCase().includes(sw))
  }
  /* 分类面板筛选 */
  if (catKeyword.value) {
    list = list.filter(d => d.name.includes(catKeyword.value))
  }
  if (catTeamType.value) {
    list = list.filter(d => d.teamType === catTeamType.value)
  }
  /* 状态标签 */
  switch (activeTab.value) {
    case 'pending':   return list.filter(d => d.status === 'pending')
    case 'completed': return list.filter(d => d.status === 'completed')
    case 'exempt':    return list.filter(d => d.status === 'exempt')
    default:          return list
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
  [catKeyword, catTeamType, activeTab, () => store.keyword],
  () => { page.value = 1 }
)

function getStatusText(status: number | string): string {
  if (typeof status === 'string') {
    const map: Record<string, string> = {
      pending: '待评分',
      partial: '部分已评',
      completed: '已完成',
      exempt: '免评',
    }
    return map[status] || status
  }
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

/* ── 详情弹窗 ── */
const detailDialogVisible = ref(false)
const detailProgram = ref<ProgramWithScore | null>(null)

function handleEdit(row: ProgramWithScore) {
  detailProgram.value = row
  detailDialogVisible.value = true
}

function handleDelete(row: ProgramWithScore) {
  if (row.status === 'exempt') {
    store.requestRescore(row.code)
    ElMessage.success(`${row.code} 已恢复`)
  } else {
    store.markAbandoned(row.code)
    ElMessage.warning(`${row.code} 已标记为弃赛`)
  }
}
</script>

<template>
  <!-- 统计信息列表 -->
  <div class="stats-list">
    <div class="stats-row">
      <div class="stats-item"><span class="stats-item-label">节目总数</span><span class="stats-item-num">{{ statsData.total_programs }}</span></div>
      <div class="stats-item"><span class="stats-item-label">待评分</span><span class="stats-item-num">{{ statsData.pending }}</span></div>
      <div class="stats-item"><span class="stats-item-label">部分评分</span><span class="stats-item-num">{{ statsData.partial }}</span></div>
    </div>
    <div class="stats-row">
      <div class="stats-item"><span class="stats-item-label">已完成</span><span class="stats-item-num">{{ statsData.completed }}</span></div>
      <div class="stats-item"><span class="stats-item-label">免评（弃赛）</span><span class="stats-item-num">{{ statsData.exempt }}</span></div>
      <div class="stats-item"></div>
    </div>
  </div>
  <div class="search-area">
    <el-form label-width="80px">
      <el-row>
        <el-col :span="6">
      <el-form-item label="节目搜索" prop="keyword">
        <div class="toolbar-search">
        <el-input
          v-model="store.keyword"
          placeholder="搜索节目编码/名称"
          clearable
          class="search-input"
        />
      </div>
      </el-form-item>
      </el-col>
      <el-col :span="8">
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
            :class="['pill', activeTab === 'pending' && 'pill--active']"
            @click="activeTab = 'pending'"
          >待评分</button>
          <button
            :class="['pill', activeTab === 'completed' && 'pill--active']"
            @click="activeTab = 'completed'"
          >已完成</button>
          <button
            :class="['pill', activeTab === 'exempt' && 'pill--active']"
            @click="activeTab = 'exempt'"
          >免评</button>
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
      <el-table-column prop="code" label="节目编码" width="200" align="center" header-align="center">
        <template #default="{ row }">
          <code class="code-cell">{{ row.code }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="school" label="学校" width="100" align="center" header-align="center" />
      <el-table-column prop="subCategory" label="类型" width="100" align="center" header-align="center" />
      <el-table-column prop="group" label="组别" width="60" align="center" header-align="center" />
      <el-table-column prop="name" label="节目名称" min-width="180" header-align="left">
        <template #default="{ row }">
          <span class="name-cell">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="teamType" label="形式" width="60" align="center" header-align="center" />
      <el-table-column label="分数" width="90" align="center" header-align="center">
        <template #default="{ row }">
          <span :class="['score-cell', row.status === 2 ? 'score-cell--final' : '', row.status === 1 ? 'score-cell--draft' : '']">
            {{ formatScore(row.score) }}
          </span>
        </template>
      </el-table-column>
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
            {{ row.status === 'exempt' ? '恢复' : '弃赛' }}
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

  <!-- ═══ 导出弹窗（组件） ═══ -->
  <ExportDialog
    v-model:visible="exportDialogVisible"
    :category-tree="CATEGORY_TREE"
  />

  <!-- ═══ 详情弹窗（组件） ═══ -->
  <DetailDialog
    v-model:visible="detailDialogVisible"
    :program="detailProgram"
  />
</template>

<style scoped>
@import './ExportView.css';
</style>
