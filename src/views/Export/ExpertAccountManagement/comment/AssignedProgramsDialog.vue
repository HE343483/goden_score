<script setup lang="ts">
import { ref, watch } from 'vue'
import { fetchExpertAssignments } from '../ExpertAccountManagement.js'
import type { ExpertApi } from '../types'

const props = defineProps<{
  visible: boolean
  expert:  ExpertApi | null | undefined
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const loading = ref(false)
const programs = ref<[]>([])

async function loadPrograms() {
  if (!props.visible || !props.expert?.id) return
  loading.value = true
  try {
    programs.value = await fetchExpertAssignments(props.expert.id)
  } catch {
    programs.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (vis) => {
  if (vis) loadPrograms()
})

watch(() => props.expert, () => {
  if (props.visible) loadPrograms()
})

function getStatusTag(status: string | null): string {
  const map: Record<string, string> = {
    pending:   '待评分',
    partial:   '部分已评',
    completed: '已完成',
    exempt:    '免评',
  }
  return map[status || ''] || status || '—'
}

function getStatusType(status: string | null): string {
  const map: Record<string, string> = {
    pending:   'info',
    partial:   'warning',
    completed: 'success',
    exempt:    'danger',
  }
  return map[status || ''] || 'info'
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return '—'
  return Number(score).toFixed(1)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="查看分配节目"
    width="1200px"
    top="8vh"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="expert" class="assign-header">
      <div class="assign-header-field">
        <span class="assign-header-label">专家姓名</span>
        <span class="assign-header-value">{{ expert.name }}</span>
      </div>
      <div class="assign-header-field">
        <span class="assign-header-label">账号</span>
        <span class="assign-header-value">{{ expert.account }}</span>
      </div>
      <div class="assign-header-field">
        <span class="assign-header-label">所属学校</span>
        <span class="assign-header-value">{{ expert.school || '—' }}</span>
      </div>
    </div>

    <div v-loading="loading" class="assign-body">
      <div v-if="!loading && programs.length === 0" class="assign-empty">
        暂无分配节目
      </div>

      <el-table
        v-else
        :data="programs"
        stripe
        size="small"
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="project_code" label="项目编码" width="140" />
        <el-table-column prop="program_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column label="项目类型" min-width="200" class-name="category-col">
          <template #default="{ row }">
           {{ row.major_category + ' / ' + row.sub_category + ' / ' + row.detail_category + ' / ' + row.team_type }}
          </template>
        </el-table-column>
        <el-table-column prop="school_name" label="申报学校" width="140" show-overflow-tooltip />
        <el-table-column label="评分状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.scoring_status)" size="small" effect="plain">
              {{ getStatusTag(row.scoring_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="70" align="center">
          <template #default="{ row }">
            <span :class="row.score !== null ? 'assign-score' : 'assign-score-null'">
              {{ formatScore(row.score) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="assign-footer">
        <el-button type="primary" @click="emit('update:visible', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.assign-header {
  display: flex;
  gap: 32px;
  padding: 0 0 16px 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light, #ebeef5);
}

.assign-header-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assign-header-label {
  font-size: 12px;
  color: var(--color-text-muted, #909399);
  letter-spacing: 0.3px;
}

.assign-header-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #303133);
}

.assign-body {
  min-height: 120px;
}

.assign-empty {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: var(--color-text-muted, #909399);
}

.assign-score {
  font-family: var(--font-mono, monospace);
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
  font-size: 13px;
}

.assign-score-null {
  color: #bbb;
  font-size: 13px;
}

.assign-footer {
  display: flex;
  justify-content: center;
}

/* 项目类别列允许换行 */
:deep(.category-col .cell) {
  white-space: normal;
  word-break: break-all;
  line-height: 1.5;
}
</style>
