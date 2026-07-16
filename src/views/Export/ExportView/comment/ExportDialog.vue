<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { exportData } from './ExportDialog.js'

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

const exporting = ref(false)

/* ── 1. 大类下拉框 ── */
const categoryOptions = computed(() => {
  return props.categoryTree.map(g => ({
    label: g.label,
    value: g.label,
  }))
})
const selectedCategory = ref('')

/* ── 2. 导出类型（单选框） ── */
type ExportType = 'score' | 'public' | 'expert'
const exportType = ref<ExportType>('score')

const exportTypeList = [
  { label: '成绩汇总表', value: 'score' as const },
  { label: '成绩排名公示表', value: 'public' as const },
  { label: '专家评分汇总表', value: 'expert' as const },
]

/* 弹窗打开时重置 */
watch(() => props.visible, (v) => {
  if (v) {
    selectedCategory.value = ''
    exportType.value = 'score'
  }
})

/* ── 导出 ── */
async function doExport() {
  if (!selectedCategory.value) {
    ElMessage.warning('请选择大类')
    return
  }

  /* export_type 映射：score→1, public→2, expert→3 */
  const typeMap: Record<ExportType, number> = {
    score: 1,
    public: 2,
    expert: 3,
  }

  exporting.value = true
  try {
    await exportData(typeMap[exportType.value], {
      category: selectedCategory.value,
    })
    ElMessage.success('导出成功')
    emit('update:visible', false)
  } catch {
    /* 拦截器已弹提示 */
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="导出数据"
    width="480px"
    top="25vh"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:visible', $event)"
  >
    <div class="export-form">
      <!-- 大类下拉框 -->
      <div class="export-form-item">
        <label class="export-form-label">大类</label>
        <el-select
          v-model="selectedCategory"
          placeholder="请选择大类"
          style="width:100%"
          clearable
        >
          <el-option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <!-- 导出类型单选框 -->
      <div class="export-form-item">
        <label class="export-form-label">导出类型</label>
        <el-radio-group v-model="exportType" class="export-radio-group">
          <el-radio
            v-for="item in exportTypeList"
            :key="item.value"
            :value="item.value"
            class="export-radio"
          >
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </div>
    </div>

    <template #footer>
      <div class="export-dialog-footer">
        <el-button @click="emit('update:visible', false)">取消</el-button>
        <el-button
          type="primary"
          :loading="exporting"
          @click="doExport"
        >
          导出
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.export-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
}

.export-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  letter-spacing: 0.5px;
}

.export-radio-group {
  display: flex;
  gap: 6px;
  padding: 4px 0;
}

.export-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
