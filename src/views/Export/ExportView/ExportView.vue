<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import { fetchAdminPrograms, fetchAdminStats, updateExemption } from './ExportView.js'
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

async function reloadPrograms() {
  const programsRes = await fetchAdminPrograms({ limit: 100 })
  store.setPrograms(programsRes.list)
}

/* ── 大类下拉选项（前端写死6个大类） ── */
const filterCategory = ref('')
const majorCategories = ['艺术表演类（集体项目）', '艺术表演类（个人项目）', '学生艺术作品类', '高校校长作品类', '艺术实践工作坊', '优秀成果申报']

/* ── 导出弹窗分类树 ── */
interface CatGroup {
  label: string
  teamType?: string
  children?: { label: string; keyword: string }[]
}
const EXPORT_CATEGORIES: CatGroup[] = [
  { label: '艺术表演类（集体项目）' },
  { label: '艺术表演类（个人项目）' },
  { label: '学生艺术作品类'},
  { label: '高校校长作品类'},
  { label: '艺术实践工作坊'},
  { label: '优秀成果申报'},
]

/* 所有数据 */
const allData = computed(() => store.allPrograms)

/* 按关键词 + 大类 + 状态标签 过滤 */
const filteredData = computed(() => {
  let list = allData.value
  /* 关键词搜索 */
  if (store.keyword) {
    const kw = store.keyword.toLowerCase()
    list = list.filter(d => d.code.toLowerCase().includes(kw) || d.name.toLowerCase().includes(kw))
  }
  /* 大类筛选 */
  if (filterCategory.value) {
    switch (filterCategory.value) {
      case '集体':
        list = list.filter(d => d.majorCategory?.includes('艺术表演') && d.teamType === '集体')
        break
      case '个人':
        list = list.filter(d => d.majorCategory?.includes('艺术表演') && d.teamType === '个人')
        break
      case '学生作品':
        list = list.filter(d => d.majorCategory?.includes('艺术作品') && d.group !== '校长')
        break
      case '校长作品':
        list = list.filter(d => d.majorCategory?.includes('艺术作品') && d.group === '校长')
        break
      case '工作坊':
        list = list.filter(d => d.majorCategory?.includes('工作坊'))
        break
      case '优秀成果':
        list = list.filter(d => d.majorCategory?.includes('美育') || d.majorCategory?.includes('优秀成果'))
        break
    }
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
  [filterCategory, activeTab, () => store.keyword],
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

async function handleDelete(row: ProgramWithScore) {
  if (row.status === 'exempt') {
    try {
      await updateExemption({ program_id: row.id, exemption_type: 'cancel_abandoned' })
      await reloadPrograms()
      ElMessage.success(`${row.code} 已恢复`)
    } catch { /* error handled by interceptor */ }
  } else {
    try {
      await updateExemption({ program_id: row.id, exemption_type: 'abandoned' })
      await reloadPrograms()
      ElMessage.success(`${row.code} 已标记为弃赛`)
    } catch { /* error handled by interceptor */ }
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
      <el-form-item label="节目类型" prop="category">
      <div class="toolbar-search">
        <el-select
          v-model="filterCategory"
          placeholder="全部大类"
          clearable
          class="search-input"
        >
          <el-option
            v-for="cat in majorCategories"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
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
          <span class="seal-btn-inner">
            <span>导出</span>
          </span>
        </el-button>
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
    :category-tree="EXPORT_CATEGORIES"
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
