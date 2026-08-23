<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElInput } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useScoreStore, type ProgramWithScore } from '@/stores/score'
import {
  fetchExpertPrograms,
  fetchSchools,
  saveScores,
  submitScores,
  uploadImage,
  recognizeOCR,
} from './ScoringView.js'
import ExpertSchools from '@/comment/ExpertSchools.vue'

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
const scoreInputRef = ref<InstanceType<typeof ElInput> | null>(null)

/* 筛选条件（后端传参） */
const filterKeyword = ref('')
const filterStatus = ref<string | null>(null)    // API 字符串：unscored / draft / submitted / no_score
const filterSchoolId = ref<number | ''>('')
/** 学校列表选项（从 API 加载） */
const schoolOptions = ref<Array<{ id: number; school_name: string }>>([])

async function fetchSchoolOptions() {
  try {
    const res = await fetchSchools()
    const body = res?.data ?? res ?? { data: [] }
    schoolOptions.value = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
  } catch {
    schoolOptions.value = []
  }
}

/* ═══════════════════════════════════════
   拍照识别（上传图片 → OCR 识别）
   ═══════════════════════════════════════ */

/** OCR 单行识别结果（对应后端 /api/ocr/recognize rows[]） */
interface OcrMismatchField {
  field: string
  ocr_value: string | null
  db_value: string | null
}

interface OcrRow {
  row_no: string
  recognized: {
    program_code: string | null
    school_name: string | null
    program_name: string | null
    score: number | null
  }
  match: {
    matched: boolean
    program_id: number | null
    mismatched_fields: OcrMismatchField[]
    block_reason: string | null
  }
  status: 'ok' | 'blocked' | 'failed' | 'skipped'
  modifiable: boolean
  score: number | null
}

interface OcrSummary {
  ok: number
  blocked: number
  failed: number
  skipped: number
  total: number
}

interface OcrResult {
  image_id: number | null
  recognized_count: number
  summary: OcrSummary
  rows: OcrRow[]
}

const cameraInputRef = ref<HTMLInputElement | null>(null)
const photoLoading = ref(false)      // 上传/识别进行中 loading
const ocrDialogVisible = ref(false)  // 识别结果弹窗显隐
const ocrResult = ref<OcrResult | null>(null)

/** 弹窗表格数据（识别结果行） */
const ocrRows = computed<OcrRow[]>(() => ocrResult.value?.rows ?? [])

/** status → 中文文案 */
const OCR_STATUS_TEXT: Record<OcrRow['status'], string> = {
  ok: '已导入',
  blocked: '已锁定',
  failed: '匹配失败',
  skipped: '已跳过',
}

/** status → el-tag 颜色类型 */
const OCR_STATUS_TAG_TYPE: Record<OcrRow['status'], 'success' | 'warning' | 'danger' | 'info'> = {
  ok: 'success',
  blocked: 'warning',
  failed: 'danger',
  skipped: 'info',
}

function ocrStatusText(status: string): string {
  return OCR_STATUS_TEXT[status as OcrRow['status']] ?? status
}

function ocrStatusType(status: string) {
  return OCR_STATUS_TAG_TYPE[status as OcrRow['status']] ?? 'info'
}

/** 点击「拍照识别」：唤起平板摄像头拍照 */
function handlePhotoRecognize() {
  const input = cameraInputRef.value
  if (!input) return
  input.value = '' // 重置以允许连续选择同一文件
  input.click()
}

/** 拍照完成：自动上传 → 自动 OCR 识别 → 弹窗展示结果 */
async function onCameraChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  photoLoading.value = true

  try {
    // 1. 上传图片（POST /api/upload）
    const uploaded = await uploadImage(file)
    if (!uploaded?.id || !uploaded?.url) {
      ElMessage.error('上传失败：接口未返回图片信息')
      return
    }
    // 2. 调用 OCR 识别（POST /api/ocr/recognize）
    const result = await recognizeOCR({ image_id: uploaded.id, url: uploaded.url })
    if (!result) {
      ElMessage.error('识别失败：接口未返回识别结果')
      return
    }
    // 3. 展示识别结果弹窗
    ocrResult.value = result
    ocrDialogVisible.value = true
  } catch {
    // 后端 code!==0 / HTTP 错误已由 request 拦截器统一弹窗，此处仅兜底
  } finally {
    photoLoading.value = false
    if (input) input.value = ''
  }
}

/** 弹窗「查看列表」：关闭弹窗并刷新列表 */
function handleViewList() {
  ocrDialogVisible.value = false
  ocrResult.value = null
  reloadPrograms()
}

const total = ref(0)

/* tab 名称 → API status 字符串 */
const TAB_STATUS_MAP: Record<string, string | null> = {
  all: null,
  unscored: 'unscored',
  draft: 'draft',
  submitted: 'submitted',
  no_score: 'no_score',
}

function checkScreen() {
  isTablet.value = window.innerWidth <= 1024
  if (!isTablet.value) sidebarOpen.value = false
}

function handleTabClick(tab: { props: { name: string } }) {
  page.value = 1
  filterStatus.value = TAB_STATUS_MAP[tab.props.name] ?? null
  reloadPrograms()
}

function handleSizeChange(val: number) {
  limit.value = val
  page.value = 1
  reloadPrograms()
}

function handleCurrentChange(val: number) {
  page.value = val
  reloadPrograms()
}

/** 点击搜索按钮 */
function handleSearch() {
  page.value = 1
  reloadPrograms()
}

/** 重置所有筛选条件 */
function handleReset() {
  filterKeyword.value = ''
  filterStatus.value = null
  filterSchoolId.value = ''
  tabActive.value = 'all'
  page.value = 1
  reloadPrograms()
}

/* 切换分数列的编辑状态 */
function onSelectionChange(selection: ProgramWithScore[]) {
  store.selectedCodes = selection.map(s => s.code)
}

function startEdit(row: ProgramWithScore) {
  editingCode.value = row.code
  if (row.status === 1 && row.score !== null && row.score !== undefined) {
    store.editingScores[row.code] = row.score
  }
  nextTick(() => {
    scoreInputRef.value?.focus()
  })
}

function checkSelectable(row: ProgramWithScore): boolean {
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
      page: page.value,
      limit: limit.value,
      keyword: filterKeyword.value || undefined,
      status: filterStatus.value || undefined,
      school_id: filterSchoolId.value || undefined,
    })
    store.setPrograms(list)
    total.value = totalCount
  } catch { /* 拦截器已弹提示 */ }
}

async function onScoreBlur(row: ProgramWithScore) {
  editingCode.value = null
  const val = store.editingScores[row.code]
  if (val === null || val === undefined) return
  await saveScores({ items: [{ program_id: row.id as number, score: val }] })
  ElMessage.success('已评分：' + row.name + ' ' + val + '分')
  await reloadPrograms()
}

async function submitAllSelected() {
  const table = multipleTableRef.value
  if (!table) return
  const selected = table.getSelectionRows() as ProgramWithScore[]
  if (selected.length === 0) {
    return ElMessage.warning('请先勾选要提交的项目')
  }
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
    ElMessage.success(`已提交 ${items.length} 个评分`)
    await reloadPrograms()
  }).catch(() => {})
}

async function logout() {
  const ok = await auth.logout()
  if (ok) router.push('/')
}

function getStatusText(status: number): string {
  switch (status) {
    case 0:   return '未评分'
    case 1:   return '已评分'
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
  await Promise.all([
    reloadPrograms(),
    fetchSchoolOptions(),
  ])
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
          <span class="sidebar-subtitle">四川省第十一届大学生艺术展演活动</span>
        </div>
      </div>

      <el-menu
        :default-active="'scoring'"
        class="sidebar-menu"
        background-color="#FFFFFF"
        text-color="#6B6B7B"
        active-text-color="#D20080"
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
          <el-form class="search-form" label-width="120px" size="large">
            <div class="search-form-inner">
              <el-form-item label="节目编码/名称" class="search-field">
                <el-input
                  v-model="filterKeyword"
                  placeholder="搜索节目编码/名称"
                  clearable
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="参赛学校" class="search-field">
                <ExpertSchools
                  v-model="filterSchoolId"
                  placeholder="全部学校"
                />
              </el-form-item>
              <el-form-item label="状态" class="search-field">
                <el-select
                  v-model="filterStatus"
                  placeholder="全部状态"
                  clearable
                  style="width: 100%"
                >
                  <el-option :value="null" label="全部状态" />
                  <el-option value="unscored" label="未评分" />
                  <el-option value="draft" label="已评分" />
                  <el-option value="submitted" label="已提交" />
                  <el-option value="no_score" label="无需评分" />
                </el-select>
              </el-form-item>
              <el-form-item label="　" class="search-field search-field-buttons">
                <el-button type="primary" @click="handleSearch">搜索</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-button
                  type="success"
                  :loading="photoLoading"
                  @click="handlePhotoRecognize"
                >拍照识别</el-button>
              </el-form-item>
            </div>
          </el-form>
        </div>

        <!-- 拍照识别：隐藏的摄像头文件选择 + 识别结果弹窗 -->
        <input
          ref="cameraInputRef"
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          class="camera-input"
          @change="onCameraChange"
        />
        <el-dialog
          v-model="ocrDialogVisible"
          :title="`识别完成，共识别 ${ocrResult?.recognized_count ?? 0} 条数据`"
          width="92%"
          top="6vh"
          append-to-body
        >
          <div class="ocr-dialog-body">
            <el-table :data="ocrRows" border size="small" max-height="60vh" style="width: 100%">
              <el-table-column prop="row_no" label="序号" width="60" align="center" />
              <el-table-column prop="recognized.program_code" label="项目编码" min-width="170" align="center" />
              <el-table-column prop="recognized.school_name" label="参展学校" min-width="120" align="center" />
              <el-table-column prop="recognized.program_name" label="参展项目" min-width="140" align="center" />
              <el-table-column prop="recognized.score" label="识别分数" width="90" align="center" />
              <el-table-column label="状态" width="140" align="center">
                <template #default="{ row }">
                  <div class="ocr-status-cell">
                    <el-tag :type="ocrStatusType(row.status)" size="small">
                      {{ ocrStatusText(row.status) }}
                    </el-tag>
                    <!-- blocked 时展示阻塞原因 -->
                    <span
                      v-if="row.status === 'blocked' && row.match?.block_reason"
                      class="ocr-block-reason"
                    >{{ row.match.block_reason }}</span>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <template #footer>
            <el-button type="primary" @click="handleViewList">查看列表</el-button>
          </template>
        </el-dialog>

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
              <el-tab-pane label="已评分" name="draft" />
              <el-tab-pane label="已提交" name="submitted" />
              <el-tab-pane label="无需评分" name="no_score" />
            </el-tabs>
          </div>

          <!-- 表格 -->
          <div class="table-wrapper">
            <el-table
              ref="multipleTableRef"
              :data="store.allPrograms"
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
                width="110"
              >
                <template #default="{ row }">
                  <span :class="['status-tag', `status-tag--${statusClass(row.status)}`]">
                    <!-- 已提交 -->
                    <svg v-if="row.status === 2" class="status-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
                    </svg>
                    <!-- 无需评分 -->
                    <svg v-else-if="row.status === -1" class="status-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" clip-rule="evenodd" />
                    </svg>
                    <!-- 其他状态用小圆点 -->
                    <span v-else class="status-dot"></span>
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
                        autofocus
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
            background
            size="small"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>

      <!-- 页脚 -->
      <footer class="app-footer">
        <span class="footer-text">@copyright 四川省第十一届大学生艺术展演活动 · 评分系统</span>
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
/* 禁用态复选框颜色加深，区分"可选"与"不可选" */
:deep(.el-table .el-table-column--selection .el-checkbox.is-disabled .el-checkbox__inner) {
  background-color: #dbdee3 !important;
  border-color: #d0d3d9 !important;
}
/* 勾选框放大 */
:deep(.el-table .el-table-column--selection .el-checkbox) {
  transform: scale(1.35);
  transform-origin: center;
}

/* 隐藏摄像头文件选择框（仅作为唤起摄像头的入口） */
.camera-input {
  display: none;
}

/* OCR 结果弹窗：状态列（标签 + 阻塞原因） */
.ocr-status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ocr-block-reason {
  font-size: 12px;
  line-height: 1.3;
  color: #e6a23c;
  word-break: break-all;
}
</style>
