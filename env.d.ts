/// <reference types="vite/client" />

/* 允许 .vue 文件导入同名的 .js 文件（LoginView.vue ← LoginView.js 等） */
declare module '*.js'

/* element-plus 中文语言包无类型声明 */
declare module 'element-plus/dist/locale/zh-cn.mjs' {
  import type { Language } from 'element-plus/es/locale'
  const locale: Language
  export default locale
}
