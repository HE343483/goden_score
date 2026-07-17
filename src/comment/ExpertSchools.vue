<!-- 学校下拉选择（支持模糊搜索） -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number, Object],
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
const emit = defineEmits(['update:modelValue', 'change'])

// 学校列表
const schools = ref([])
// 加载状态
const loading = ref(false)
// 错误信息
const error = ref('')
// 本地选中值
const selectedValue = ref(props.modelValue)
// 搜索关键字
const searchKeyword = ref('')

// 定时器（防抖）
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 监听modelValue变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && typeof newValue === 'object') {
      const id = newValue.id || newValue[props.valueField]
      if (id !== undefined) {
        selectedValue.value = id
        emit('update:modelValue', id)
      } else {
        selectedValue.value = newValue
      }
    } else {
      selectedValue.value = newValue
    }
  },
  { immediate: true },
)

// 获取学校列表（支持关键字模糊搜索）
const fetchSchools = async (keyword = '') => {
  try {
    loading.value = true
    error.value = ''
    const params: Record<string> = {}
    if (keyword) params.keyword = keyword
    const response = await request.get('/expert/schools', {
      params,
      validateStatus: (status) => status < 500,
    })

    if (response.status === 401) {
      error.value = '获取学校列表失败'
      schools.value = []
      return
    }

    const body = response?.data ?? {}
    const explicitFail =
      body.success === false ||
      (body.code !== undefined && body.code !== 0)
    if (explicitFail) {
      throw new Error(body.msg || '获取学校列表失败')
    }

    const raw = body.data
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.list) ? raw.list : []
    schools.value = list.map((item, idx) => {
      const id = item.id ?? idx
      const school_name = item.school_name ?? item.name ?? String(item.value ?? '')
      return { ...item, id, school_name }
    })

    // 如果当前selectedValue是对象，尝试匹配
    if (selectedValue.value && typeof selectedValue.value === 'object') {
      const match = schools.value.find(
        (item) =>
          item.id === selectedValue.value.id ||
          item.school_name === selectedValue.value.school_name,
      )
      if (match) {
        selectedValue.value = match[props.valueField] || match.school_name || match.name
        emit('update:modelValue', selectedValue.value)
      }
    }
  } catch (err) {
    console.error('获取学校列表失败:', err)
    error.value = err.message || '获取学校列表失败'
    ElMessage.error(error.value)
    schools.value = []
  } finally {
    loading.value = false
  }
}

// 远程搜索（防抖）
const remoteMethod = (query: string) => {
  searchKeyword.value = query
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchSchools(query)
  }, 300)
}

// 下拉打开时加载全部
const handleVisibleChange = (visible: boolean) => {
  if (visible && schools.value.length === 0) {
    fetchSchools()
  }
}

// 处理选择变化
const handleChange = (value) => {
  selectedValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
}

// 组件挂载时获取数据
onMounted(() => {
  fetchSchools()
})
</script>

<template>
  <div class="school-select">
    <el-select
      v-model="selectedValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="size"
      :loading="loading"
      filterable
      remote
      :remote-method="remoteMethod"
      @change="handleChange"
      @visible-change="handleVisibleChange"
      style="width: 100%"
      clearable
    >
      <el-option
        v-for="(item, index) in schools"
        :key="item.id ?? index"
        :label="item.school_name || item.name || String(item.value ?? '')"
        :value="item[valueField] ?? item.school_name ?? item.name ?? item.id"
      />
    </el-select>
  </div>
</template>

<style scoped>
.school-select {
  width: 100%;
}
</style>
