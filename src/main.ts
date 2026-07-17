import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'

/* 项目全局样式 — 放在 element-plus 之后，覆盖其默认变量 */
import './assets/main.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 从 sessionStorage 恢复登录状态（刷新保留，关闭浏览器后清除）
const auth = useAuthStore()
auth.restore()

app.mount('#app')
