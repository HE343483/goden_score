<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  fetchExperts,
  updateExpertStatus,
} from './ExpertAccountManagement.js'
import AssignedProgramsDialog from './comment/AssignedProgramsDialog.vue'

/* ── 状态 ── */
const loading = ref(false)
const experts = ref<ExpertApi[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(15)

/* ── 查询条件 ── */
const filterSchool = ref('')
const filterStatus = ref('')
const schoolOptions = ref<string[]>([])

/* ── 查看分配节目对话框 ── */
const programsDialogVisible = ref(false)
const programsTarget = ref<ExpertApi>(null)

/* ── 更改状态对话框 ── */
const statusDialogVisible = ref(false)
const statusTarget = ref(null)
const newStatus = ref('')

/* ── 加载数据 ── */
async function loadData() {
  loading.value = true
  try {
    const res = await fetchExperts({
      page: page.value,
      limit: limit.value,
      school: filterSchool.value || undefined,
      status: filterStatus.value || undefined,
    })
    experts.value = res.list
    total.value = res.total
  } catch {
    ElMessage.error('获取专家列表失败')
  } finally {
    loading.value = false
  }
}

async function loadSchools() {
  try {
    schoolOptions.value = await fetchSchoolList()
  } catch {
    // 静默失败
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleReset() {
  filterSchool.value = ''
  filterStatus.value = ''
  page.value = 1
  loadData()
}

function handlePageChange(p: number) {
  page.value = p
  loadData()
}

/* ── 查看分配节目 ── */
function openProgramsDialog(row: any) {
  programsTarget.value = row
  programsDialogVisible.value = true
}

/* ── 更改状态 ── */
function openStatusDialog(row: any) {
  statusTarget.value = row
  newStatus.value = row.status
  statusDialogVisible.value = true
}

async function confirmStatus() {
  if (!statusTarget.value) return
  const label = newStatus.value === 'enabled' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(
      `确定将专家「${statusTarget.value.name}」${label}吗？`,
      '确认操作',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await updateExpertStatus(statusTarget.value.id, newStatus.value)
    ElMessage.success(`已${label}`)
    statusDialogVisible.value = false
    loadData()
  } catch {
    // 取消或失败均不做处理
  }
}

onMounted(() => {
  loadSchools()
  loadData()
})
</script>

<template>
  <div >
    <!-- 查询条件 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" label-width="auto" size="default">
        <el-form-item label="学校">
          <el-input
            v-model="filterSchool"
            placeholder="输入学校名称模糊搜索"
            clearable
            style="width: 230px"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option label="启用" value="enabled" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        :data="experts"
        v-loading="loading"
        stripe
        style="width: 100%"
        size="default"
      >
        <el-table-column type="index" label="序号" width="70" align="center" />
        <el-table-column prop="account" label="账号" min-width="160" />
        <el-table-column prop="name" label="名字" min-width="130" />
        <el-table-column prop="school" label="学校" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
              {{ row.statusLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openProgramsDialog(row)">
              查看分配节目
            </el-button>
            <el-button type="warning" link size="small" @click="openStatusDialog(row)">
              更改状态
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          :total="total"
          :page-sizes="[15, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="page = 1; loadData()"
        />
      </div>
    </el-card>

    <!-- 查看分配节目对话框 -->
    <AssignedProgramsDialog
      v-model:visible="programsDialogVisible"
      :expert="programsTarget"
    />

    <!-- 更改状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更改状态"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="专家姓名">
          <span class="dialog-value">{{ statusTarget?.name }}</span>
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag
            :type="statusTarget?.status === 'enabled' ? 'success' : 'info'"
            size="small"
          >
            {{ statusTarget?.statusLabel }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新状态">
          <el-radio-group v-model="newStatus">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatus">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.experts-page {
  max-width: 1200px;
}

/* ═══ 页面标题 ═══ */
.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px 0;
  letter-spacing: 1px;
}

.page-desc {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

/* ═══ 查询卡片 ═══ */
.search-card {
  margin-bottom: 16px;
  border-radius: var(--radius-md, 8px);
}

.search-card :deep(.el-card__body) {
  padding: 16px 20px 0 20px;
}

/* ═══ 表格卡片 ═══ */
.table-card {
  border-radius: var(--radius-md, 8px);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 20px 0 4px;
}

/* ═══ 对话框 ═══ */
.dialog-value {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}
</style>
