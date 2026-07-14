<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ProgramWithScore } from '@/stores/score'
import { fetchProgramDetail } from './DetailDialog.js'

const props = defineProps<{
  visible: boolean
  program: ProgramWithScore | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

interface ReviewerScore {
  reviewer_id: number
  reviewer_name: string
  reviewer_school: string
  score: number | null
  status: string | null
  is_excluded: boolean
  exclude_reason: string | null
  submitted_at: string | null
}

const loading = ref(false)
const detail = ref<{
  program_code: string
  program_name: string
  major_category: string
  sub_category: string
  detail_category: string
  school_name: string
  program_status: string
  exempt_reason: string | null
  scores: ReviewerScore[]
} | null>(null)

watch(() => [props.visible, props.program], async ([vis, prog]) => {
  if (vis && prog?.id) {
    loading.value = true
    detail.value = await fetchProgramDetail(prog.id)
    loading.value = false
  }
})

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}

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
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="项目详情"
    width="600px"
    top="10vh"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="program && detail" class="detail-body" v-loading="loading">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="detail-section-title">基本信息</h3>
        <div class="detail-grid">
          <div class="detail-field">
            <span class="detail-label">项目编码</span>
            <span class="detail-value mono">{{ detail.program_code }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">项目名称</span>
            <span class="detail-value">{{ detail.program_name }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">学校</span>
            <span class="detail-value">{{ detail.school_name }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">类别</span>
            <span class="detail-value">{{ detail.major_category }} · {{ detail.sub_category }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">状态</span>
            <span class="detail-value">
              <span :class="['detail-status', `detail-status--${detail.program_status}`]">
                {{ getStatusText(detail.program_status) }}
              </span>
            </span>
          </div>
          <div v-if="detail.exempt_reason" class="detail-field">
            <span class="detail-label">免评原因</span>
            <span class="detail-value">{{ detail.exempt_reason }}</span>
          </div>
        </div>
      </div>

      <!-- 专家评分明细 -->
      <div class="detail-section">
        <h3 class="detail-section-title">
          专家评分明细
          <span class="detail-section-count">{{ detail.scores.length }} 位专家</span>
        </h3>

        <div v-if="detail.scores.length === 0" class="detail-empty">
          暂无评分数据
        </div>

        <div v-else class="detail-judges">
          <div
            v-for="s in detail.scores"
            :key="s.reviewer_id"
            :class="['detail-judge-row', { 'detail-judge-row--excluded': s.is_excluded }]"
          >
            <div class="detail-judge-avatar">{{ s.reviewer_name.charAt(0) }}</div>
            <div class="detail-judge-info">
              <span class="detail-judge-name">
                {{ s.reviewer_name }}
                <span v-if="s.is_excluded" class="detail-judge-tag">排除</span>
              </span>
              <span class="detail-judge-meta">{{ s.reviewer_school }}</span>
            </div>
            <div class="detail-judge-right">
              <strong :class="s.score !== null ? 'detail-judge-num' : 'detail-judge-null'">
                {{ formatScore(s.score) }}
              </strong>
              <span class="detail-judge-status">{{ s.status === 'submitted' ? '已提交' : s.status === 'draft' ? '草稿' : '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="detail-footer">
        <el-button type="primary" @click="emit('update:visible', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-body {
  max-height: 65vh;
  overflow-y: auto;
  padding: 0 4px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.5px;
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 11.5px;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
}

.detail-value {
  font-size: 14px;
  color: var(--color-text);
  letter-spacing: 0.3px;
}

.detail-value.mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.detail-status {
  display: inline-block;
  padding: 1px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}
.detail-status--0  { background: #F5F5F5; color: #999; }
.detail-status--1  { background: #EBF3FA; color: #3A7AB5; }
.detail-status--2  { background: #E8F5EE; color: #2E7D5B; }
.detail-status--\-2 { background: #FFF0ED; color: #C0392B; }
.detail-status--\-3 { background: #F0EDF5; color: #7B6FA0; }
.detail-status--pending   { background: #F5F5F5; color: #999; }
.detail-status--partial   { background: #EBF3FA; color: #3A7AB5; }
.detail-status--completed { background: #E8F5EE; color: #2E7D5B; }
.detail-status--exempt    { background: #FFF0ED; color: #C0392B; }

.detail-empty {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.detail-judges {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-judge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
}

.detail-judge-row--excluded {
  opacity: 0.6;
  border-color: #FAD1D1;
  background: #FFF8F8;
}

.detail-judge-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-accent-subtle);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.detail-judge-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}

.detail-judge-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-judge-tag {
  font-size: 10px;
  padding: 0 6px;
  border-radius: 8px;
  background: #FFF0ED;
  color: #C0392B;
  font-weight: 500;
}

.detail-judge-meta {
  font-size: 11.5px;
  color: var(--color-text-muted);
}

.detail-judge-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.detail-judge-num {
  font-family: var(--font-mono);
  color: var(--color-accent);
  font-weight: 600;
  font-size: 16px;
}

.detail-judge-null {
  color: #BBB;
  font-weight: 400;
  font-size: 14px;
}

.detail-judge-status {
  font-size: 11px;
  color: var(--color-text-muted);
}

.detail-footer {
  display: flex;
  justify-content: center;
}
</style>
