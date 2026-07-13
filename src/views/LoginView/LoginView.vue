<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { doLoginApi } from './LoginView.js'

const router = useRouter()
const auth = useAuthStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function doLogin(username: string, password: string) {
  try {
    const { user } = await doLoginApi(username, password)
    ElMessage.success('登录成功')
    auth.setUser({ username: user.username, name: user.name, role: user.role })
    const path = user.role === 'reviewer' ? '/scoring' : '/export'
    router.push(path)
  } catch (err) {
    ElMessage.error(err.message || '账号或密码错误，请重试')
  }
}

function submit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return
    loading.value = true
    doLogin(form.username, form.password).finally(() => {
      loading.value = false
    })
  })
}
</script>

<template>
  <div class="login-page">
    <el-card shadow="never" class="login-card" :body-style="{ padding: 0 }">
      <div class="seal-logo-wrapper">
        <el-image
          src="/logo.png"
          class="login-logo"
          fit="contain"
        />
      </div>

      <el-text
        tag="h1"
        class="login-title"
        :style="{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, letterSpacing: '3px', lineHeight: '1.4', marginTop: '18px', padding: '0 32px' }"
      >
        四川省大学生艺术展演
      </el-text>

      <el-text
        tag="p"
        type="info"
        size="small"
        class="login-subtitle"
      >
        评 分 系 统
      </el-text>

      <el-form
        ref="formRef"
        class="login-form"
        :model="form"
        :rules="rules"
        @keyup.enter="submit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入账号"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            placeholder="请输入密码"
            type="password"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            class="login-btn"
            :loading="loading"
            size="large"
            @click="submit"
            :style="{ width: '100%', letterSpacing: '8px', fontWeight: 600, borderRadius: 'var(--radius-md)' }"
          >
            登　录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;
}

.bg-seal {
  position: absolute;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-accent-subtle);
  user-select: none;
  opacity: 0.15;
}

.bg-seal--1 {
  font-size: clamp(120px, 20vw, 260px);
  top: -3%;
  right: -2%;
  transform: rotate(12deg);
}

.bg-seal--2 {
  font-size: clamp(80px, 14vw, 180px);
  bottom: 8%;
  left: 4%;
  transform: rotate(-8deg);
  opacity: 0.10;
}

.bg-seal--3 {
  font-size: clamp(60px, 10vw, 130px);
  top: 45%;
  left: 55%;
  transform: rotate(25deg);
  opacity: 0.07;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 400px;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
  border: none !important;
  animation: rise-up 0.5s ease;
  overflow: hidden;
}

.login-card :deep(.el-card__body) {
  text-align: center;
}

.seal-logo-wrapper {
  padding-top: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-logo {
  width: 120px;
  height: 120px;
  border-radius: 16px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: var(--color-card);
}

.login-subtitle {
  letter-spacing: 8px;
  margin-top: 5px;
}

.login-form {
  margin-top: 28px;
  padding: 0 40px;
}

.login-form :deep(.el-input__wrapper) {
  background: #F5F3EE;
  border: 1px solid transparent;
  transition: all 0.25s;
  padding: 4px 14px;
  box-shadow: none !important;
}

.login-form :deep(.el-input__wrapper:hover) {
  border-color: var(--color-border);
  background: var(--color-card);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-accent);
  background: var(--color-card);
  box-shadow: 0 0 0 3px var(--color-accent-light) !important;
}

.login-form :deep(.el-input__inner) {
  font-size: 15px;
  color: var(--color-text);
  background: transparent;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: var(--color-text-muted);
  font-weight: 400;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--color-seal-shadow);
}

.login-btn:active {
  transform: translateY(0);
}


.quick-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.quick-dot {
  opacity: 0.4;
}

@keyframes rise-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1024px) {
  .login-card { width: 380px; }
  .login-form { padding: 0 32px; }
}

@media (max-width: 480px) {
  .login-card {
    width: calc(100% - 32px);
    border-radius: var(--radius-md) !important;
  }

  .seal-logo-wrapper { padding-top: 32px; }
  .seal-logo { --el-avatar-size: 60px !important; font-size: 28px !important; }

  .login-form { padding: 0 20px; margin-top: 22px; }

  .bg-seal--1 { display: none; }
  .bg-seal--2 { font-size: 100px; bottom: -5%; }
}
</style>
