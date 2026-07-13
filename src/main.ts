import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 从 sessionStorage 恢复登录状态（刷新保留，关闭浏览器后清除）
const auth = useAuthStore()
auth.restore()

app.mount('#app')
