<template>
  <div class="customer-levels-dropdown">
    <el-select
      v-model="selectedValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="size"
      :loading="loading"
      filterable
      remote
      :remote-method="remoteSearch"
      @change="handleChange"
      @clear="handleClear"
      style="width: 100%"
      clearable
    >
      <el-option
        v-for="(item, index) in schoolList"
        :key="item.id ?? index"
        :label="item.school_name || item.name || String(item.value ?? '')"
        :value="item[valueField] ?? item.school_name ?? item.name ?? item.id"
      >
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import request from '@/utils/request'

interface SchoolItem {
  id?: number | string
  school_name?: string
  name?: string
  value?: number | string
  [key: string]: any
}

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number, Object] as unknown as () => string | number | Record<string, any>,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请选择学校',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'default',
  },
  valueField: {
    type: String,
    default: 'id',
  },
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | Record<string, any>): void
  (e: 'change', value: string | number | Record<string, any>): void
}>()

// 学校列表
const schoolList = ref<SchoolItem[]>([])
// 加载状态
const loading = ref(false)
// 本地选中值
const selectedValue = ref<string | number | Record<string, any>>(props.modelValue)

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    selectedValue.value = newValue as string | number
  },
  { immediate: true },
)

/**
 * 请求学校列表（模糊搜索）
 */
const fetchSchools = async (keyword?: string) => {
  try {
    loading.value = true
    const response = await request.get('/expert/schools', {
      params: { keyword: keyword || '', limit: 200 },
      validateStatus: (status: number) => status < 500,
    })

    const body = response?.data ?? {}
    const explicitFail =
      body.success === false ||
      (body.code !== undefined && body.code !== 0)
    if (explicitFail) {
      throw new Error(body.msg || '获取学校列表失败')
    }

    const raw: unknown = body.data
    const list: SchoolItem[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.list) ? (raw as any).list : []
    schoolList.value = list.map((item: SchoolItem, idx: number) => {
      const id = item.id ?? idx
      const school_name = item.school_name ?? item.name ?? String(item.value ?? '')
      return { ...item, id, school_name }
    })
  } catch (err: unknown) {
    console.error('获取学校列表失败:', err)
    schoolList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 远程搜索回调 — 用户输入时触发
 */
const remoteSearch = (keyword: string) => {
  fetchSchools(keyword)
}

/**
 * 选择变化
 */
const handleChange = (value: string | number | Record<string, any>) => {
  selectedValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
}

/**
 * 清空时恢复初始列表
 */
const handleClear = () => {
  fetchSchools()
}

// 组件挂载时加载全部学校（下拉框初始展开有数据）
onMounted(() => {
  fetchSchools()
})
</script>

<style scoped>
.customer-levels-dropdown {
  width: 100%;
}
</style>
