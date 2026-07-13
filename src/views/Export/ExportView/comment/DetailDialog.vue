<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ProgramWithScore } from '@/stores/score'
import { useScoreStore } from '@/stores/score'

const store = useScoreStore()

const props = defineProps<{
  visible: boolean
  program: ProgramWithScore | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

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

function handleResetJudge(judgeName: string) {
  if (!props.program) return
  ElMessageBox.confirm(
    `确定将「${judgeName}」的评分重置为未评吗？`,
    '重新评分',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    store.resetJudgeScore(props.program!.code, judgeName)
    ElMessage.success(`已重置 ${judgeName} 的评分`)
  }).catch(() => {})
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="项目详情"
    width="560px"
    top="10vh"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="program" class="detail-body">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="detail-section-title">基本信息</h3>
        <div class="detail-grid">
          <div class="detail-field">
            <span class="detail-label">项目编码</span>
            <span class="detail-value mono">{{ program.code }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">项目名称</span>
            <span class="detail-value">{{ program.name }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">学校</span>
            <span class="detail-value">{{ program.school }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">类别</span>
            <span class="detail-value">{{ program.majorCategory }} · {{ program.subCategory }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">组别</span>
            <span class="detail-value">{{ program.group }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">形式</span>
            <span class="detail-value">{{ program.teamType }}</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">人数</span>
            <span class="detail-value">{{ program.participantCount }} 人</span>
          </div>
          <div class="detail-field">
            <span class="detail-label">状态</span>
            <span class="detail-value">
              <span :class="['detail-status', `detail-status--${program.status}`]">
                {{ getStatusText(program.status) }}
              </span>
            </span>
          </div>
          <div v-if="program.award" class="detail-field">
            <span class="detail-label">奖项</span>
            <span class="detail-value">{{ program.award }}</span>
          </div>
        </div>
      </div>

      <!-- 评委评分 -->
      <div class="detail-section">
        <h3 class="detail-section-title">
          评委评分
          <span class="detail-section-count">{{ program.judges.length }} 位评委</span>
        </h3>

        <div v-if="program.judges.length === 0" class="detail-empty">
          暂无评委数据
        </div>

        <div v-else class="detail-judges">
          <div
            v-for="(judge, idx) in program.judges"
            :key="idx"
            class="detail-judge-row"
          >
            <div class="detail-judge-avatar">{{ judge.name.charAt(0) }}</div>
            <div class="detail-judge-info">
              <span class="detail-judge-name">{{ judge.name }}</span>
              <span class="detail-judge-score">
                评分：<strong :class="judge.score !== null ? 'detail-judge-num' : 'detail-judge-null'">
                  {{ formatScore(judge.score) }}
                </strong>
              </span>
            </div>
            <el-button
              size="small"
              text
              type="warning"
              class="detail-judge-btn"
              @click="handleResetJudge(judge.name)"
            >
              重新评分
            </el-button>
          </div>
        </div>
      </div>

      <!-- 总评分 -->
      <div class="detail-total">
        <span class="detail-total-label">综合评分</span>
        <span class="detail-total-score">{{ formatScore(program.score) }}</span>
        <span class="detail-total-award" v-if="program.award">{{ program.award }}</span>
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

/* ── 区块 ── */
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

/* ── 信息网格 ── */
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

/* ── 状态标签 ── */
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

/* ── 空状态 ── */
.detail-empty {
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

/* ── 评委列表 ── */
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
  transition: box-shadow 0.15s;
}

.detail-judge-row:hover {
  box-shadow: var(--shadow-sm);
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
}

.detail-judge-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.detail-judge-score {
  font-size: 12px;
  color: var(--color-text-muted);
  letter-spacing: 0.3px;
}

.detail-judge-num {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 14px;
}

.detail-judge-null {
  color: #BBB;
  font-weight: 400;
}

.detail-judge-btn {
  flex-shrink: 0;
  margin-left: auto;
}

/* ── 综合评分条 ── */
.detail-total {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: var(--color-accent-light);
  border: 1px solid var(--color-border-light);
}

.detail-total-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.detail-total-score {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-accent);
}

.detail-total-award {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-jade);
  padding: 2px 12px;
  border-radius: 12px;
  background: var(--color-card);
}

.detail-footer {
  display: flex;
  justify-content: center;
}
</style>
