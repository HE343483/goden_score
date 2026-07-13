<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useScoreStore } from '@/stores/score'

/* ── 类型（与 ExportView 保持一致） ── */
interface CatLeaf {
  label: string
  keyword: string
}
interface CatGroup {
  label: string
  teamType?: string
  children: CatLeaf[]
}

const props = defineProps<{
  visible: boolean
  categoryTree: CatGroup[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const store = useScoreStore()
const allData = computed(() => store.allPrograms)
const exporting = ref(false)

/* ── 状态筛选 ── */
const exportStatus = ref<'all' | 'scored' | 'submitted' | 'abandoned'>('all')

/* ── 展开状态（默认全关） ── */
const expandedSet = ref<Set<string>>(new Set())

function toggleExpand(label: string) {
  const next = new Set(expandedSet.value)
  if (next.has(label)) {
    next.delete(label)
  } else {
    next.add(label)
  }
  expandedSet.value = next
}

/* ── 扁平叶子列表 ── */
interface ExportLeafItem {
  groupLabel: string
  groupTeamType: string | undefined
  leaf: CatLeaf
}
const exportLeafList = computed<ExportLeafItem[]>(() => {
  const list: ExportLeafItem[] = []
  for (const group of props.categoryTree) {
    for (const leaf of group.children) {
      list.push({ groupLabel: group.label, groupTeamType: group.teamType, leaf })
    }
  }
  return list
})

/* ── 选中状态（默认全选） ── */
const selectedLeafLabels = ref<Set<string>>(new Set())

/* 弹窗打开时重置（默认全部未选） */
watch(() => props.visible, (v) => {
  if (v) {
    selectedLeafLabels.value = new Set()
    expandedSet.value = new Set()
    exportStatus.value = 'all'
  }
})

function toggleAll() {
  if (selectedLeafLabels.value.size === exportLeafList.value.length) {
    selectedLeafLabels.value = new Set()
  } else {
    selectedLeafLabels.value = new Set(exportLeafList.value.map(item => item.leaf.label))
  }
}

function toggleLeaf(label: string) {
  const next = new Set(selectedLeafLabels.value)
  if (next.has(label)) { next.delete(label) }
  else { next.add(label) }
  selectedLeafLabels.value = next
}

/* ── 过滤要导出的数据 ── */
const selectedKeywords = computed(() => {
  return new Set(
    exportLeafList.value
      .filter(item => selectedLeafLabels.value.has(item.leaf.label))
      .map(item => item.leaf.keyword)
  )
})

const exportData = computed(() => {
  if (selectedKeywords.value.size === 0) return []
  let list = allData.value.filter(d => {
    for (const kw of selectedKeywords.value) {
      if (d.name.includes(kw)) return true
    }
    return false
  })
  /* 状态过滤 */
  switch (exportStatus.value) {
    case 'scored':    list = list.filter(d => d.status >= 1); break
    case 'submitted': list = list.filter(d => d.status === 2); break
    case 'abandoned': list = list.filter(d => d.status === -2); break
  }
  return list
})

/* ── 工具函数 ── */
function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

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

function getLeafCount(leaf: CatLeaf): number {
  let list = allData.value.filter(d => d.name.includes(leaf.keyword))
  switch (exportStatus.value) {
    case 'scored':    list = list.filter(d => d.status >= 1); break
    case 'submitted': list = list.filter(d => d.status === 2); break
    case 'abandoned': list = list.filter(d => d.status === -2); break
  }
  return list.length
}

/* ── 导出 ── */
function doExport() {
  if (selectedLeafLabels.value.size === 0) {
    ElMessage.warning('请至少选择一个小类')
    return
  }
  exporting.value = true
  emit('update:visible', false)

  setTimeout(() => {
    const BOM = '﻿'
    const headers = ['项目编码', '项目名称', '学校', '大类', '报名类型', '组别', '形式', '分数', '奖项', '状态']

    const data = exportData.value
    /* 按大类分组 */
    const groups = new Map<string, typeof data>()
    for (const d of data) {
      const key = `${d.majorCategory}|${d.subCategory}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(d)
    }

    const lines: string[] = [BOM + headers.join(',')]
    for (const [, items] of groups) {
      const first = items[0]
      lines.push(`\n【${first.majorCategory} · ${first.subCategory}】`)
      for (const d of items) {
        lines.push([
          d.code,
          `"${d.name}"`,
          `"${d.school}"`,
          `"${d.majorCategory}"`,
          d.subCategory,
          d.group,
          d.teamType,
          formatScore(d.score),
          d.award || '',
          getStatusText(d.status),
        ].join(','))
      }
    }
    const csv = lines.join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    a.download = `艺术展演评分表_${ts}.csv`
    a.click()
    URL.revokeObjectURL(url)

    exporting.value = false
    ElMessage.success(`已导出 ${data.length} 项数据`)
  }, 200)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="选择导出小类"
    width="520px"
    top="8vh"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="export-dialog-body">
      <!-- 顶部操作栏 -->
      <div class="export-dialog-toolbar">
        <span class="export-dialog-count">
          已选 <strong>{{ selectedLeafLabels.size }}</strong> / {{ exportLeafList.length }} 个小类 ·
          共 <strong>{{ exportData.length }}</strong> 项数据
        </span>
        <el-button size="small" text @click="toggleAll">
          {{ selectedLeafLabels.size === exportLeafList.length ? '取消全选' : '全选' }}
        </el-button>
      </div>

      <!-- 状态筛选 -->
      <div class="export-status-bar">
        <span
          :class="['export-status-pill', { 'export-status-pill--on': exportStatus === 'all' }]"
          @click="exportStatus = 'all'"
        >全部</span>
        <span
          :class="['export-status-pill', { 'export-status-pill--on': exportStatus === 'scored' }]"
          @click="exportStatus = 'scored'"
        >已评分</span>
        <span
          :class="['export-status-pill', { 'export-status-pill--on': exportStatus === 'submitted' }]"
          @click="exportStatus = 'submitted'"
        >已提交</span>
        <span
          :class="['export-status-pill', { 'export-status-pill--on': exportStatus === 'abandoned' }]"
          @click="exportStatus = 'abandoned'"
        >弃赛</span>
      </div>

      <!-- 分类列表（默认收起） -->
      <div class="export-dialog-list">
        <template v-for="group in categoryTree" :key="group.label">
          <!-- 分组标题（可点击展开） -->
          <div class="export-group-label" @click="toggleExpand(group.label)">
            <span class="export-group-arrow">{{ expandedSet.has(group.label) ? '▾' : '▸' }}</span>
            <span>{{ group.label }}</span>
          </div>

          <!-- 子选项（展开时显示） -->
          <template v-if="expandedSet.has(group.label)">
            <div
              v-for="leaf in group.children"
              :key="leaf.label"
              :class="['export-leaf-item', {
                'export-leaf-item--on': selectedLeafLabels.has(leaf.label)
              }]"
              @click="toggleLeaf(leaf.label)"
            >
              <span class="export-leaf-box">
                <span v-if="selectedLeafLabels.has(leaf.label)" class="export-leaf-box-tick">✓</span>
              </span>
              <span class="export-leaf-name">{{ leaf.label }}</span>
              <span class="export-leaf-count">{{ getLeafCount(leaf) }} 项</span>
            </div>
          </template>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="export-dialog-footer">
        <el-button :disabled="exporting" @click="emit('update:visible', false)">取消</el-button>
        <el-button
          type="primary"
          :loading="exporting"
          :disabled="selectedLeafLabels.size === 0"
          @click="doExport"
        >
          导出 ({{ exportData.length }} 项)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.export-dialog-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 4px;
}

.export-dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border-light);
}

.export-dialog-count {
  font-size: 13px;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
}

.export-dialog-count strong {
  color: var(--color-text);
  font-weight: 600;
}

/* ── 状态筛选条 ── */
.export-status-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  background: var(--color-bg-subtle, #EDE9E0);
  padding: 3px;
  border-radius: var(--radius-sm);
}

.export-status-pill {
  flex: 1;
  text-align: center;
  padding: 4px 0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.2s;
  user-select: none;
}

.export-status-pill:hover {
  color: var(--color-text);
}

.export-status-pill--on {
  background: var(--color-card);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  font-weight: 600;
}

.export-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── 分组标题 ── */
.export-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text);
  padding: 9px 8px 5px 4px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.export-group-label:hover {
  color: var(--color-accent);
}

.export-group-label:first-child {
  padding-top: 0;
}

.export-group-arrow {
  width: 14px;
  text-align: center;
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

/* ── 叶子项 ── */
.export-leaf-item {
  display: flex;
  align-items: center;
  padding: 7px 10px 7px 24px;
  margin: 0 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  gap: 10px;
}

.export-leaf-item:hover {
  background: var(--color-accent-light);
}

.export-leaf-item--on {
  background: var(--color-accent-light);
}

.export-leaf-box {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.export-leaf-item--on .export-leaf-box {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.export-leaf-box-tick {
  font-size: 12px;
  font-weight: 700;
}

.export-leaf-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.export-leaf-count {
  font-size: 12px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.export-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
