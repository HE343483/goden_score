<!-- 下拉查询客户等级 -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

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

// 客户等级列表
const customerLevels = ref<SchoolItem[]>([])
// 加载状态
const loading = ref(false)
// 错误信息
const error = ref('')
// 本地选中值，避免直接修改modelValue
const selectedValue = ref<string | number | Record<string, any>>(props.modelValue)

// 监听modelValue变化，更新本地选中值
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && typeof newValue === 'object') {
      // 如果是对象，尝试提取ID
      const id = (newValue as Record<string, any>).id || newValue[props.valueField as keyof typeof newValue]
      if (id !== undefined) {
        selectedValue.value = id
        emit('update:modelValue', id)
      } else {
        // 如果无法提取ID，可能需要根据名称匹配，但这需要在options加载后进行
        // 这里暂时保持原值，等待fetchCustomerLevels处理
        selectedValue.value = newValue
      }
    } else {
      selectedValue.value = newValue as string | number
    }
  },
  { immediate: true },
)

// 获取客户等级列表
const fetchCustomerLevels = async () => {
  try {
    loading.value = true
    error.value = ''
    const response = await request.get('/expert/schools', {
      validateStatus: (status: number) => status < 500,
    })

    if (response.status === 401) {
      // admin 登录时此接口无权限，静默失败，不清空数据
      error.value = '获取学校列表失败'
      customerLevels.value = []
      return
    }

    const body = response?.data ?? {}
    const explicitFail =
      body.success === false ||
      (body.code !== undefined && body.code !== 0)
    if (explicitFail) {
      throw new Error(body.msg || '获取客户等级列表失败')
    }

    const raw: unknown = body.data
    const list: SchoolItem[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.list) ? (raw as any).list : []
    customerLevels.value = list.map((item: SchoolItem, idx: number) => {
      const id = item.id ?? idx
      const school_name = item.school_name ?? item.name ?? String(item.value ?? '')
      return { ...item, id, school_name }
    })

    // 如果当前selectedValue是对象，尝试提取其ID或名称以匹配选项
    if (selectedValue.value && typeof selectedValue.value === 'object') {
      const sv = selectedValue.value as Record<string, any>
      const match = customerLevels.value.find(
        (item: SchoolItem) =>
          item.id === sv.id ||
          item.school_name === sv.school_name,
      )
      if (match) {
        selectedValue.value = match[props.valueField as keyof SchoolItem] || match.school_name || match.name
        emit('update:modelValue', selectedValue.value)
      }
    }
  } catch (err: unknown) {
    console.error('获取客户等级列表失败:', err)
    error.value = err instanceof Error ? err.message : '获取客户等级列表失败'
    ElMessage.error(error.value)
    customerLevels.value = []
  } finally {
    loading.value = false
  }
}

// 处理选择变化
const handleChange = (value: string | number | Record<string, any>) => {
  selectedValue.value = value
  emit('update:modelValue', value)
  emit('change', value)
}

// 组件挂载时获取数据
onMounted(() => {
  fetchCustomerLevels()
})
</script>

<template>
  <div class="customer-levels-dropdown">
    <el-select
      v-model="selectedValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :size="size"
      :loading="loading"
      @change="handleChange"
      style="width: 100%"
      clearable
    >
      <el-option
        v-for="(item, index) in customerLevels"
        :key="item.id ?? index"
        :label="item.school_name || item.name || String(item.value ?? '')"
        :value="item[valueField] ?? item.school_name ?? item.name ?? item.id"
      >
      </el-option>
    </el-select>
  </div>
</template>

<style scoped>
.customer-levels-dropdown {
  width: 100%;
}
</style>
