import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView/LoginView.vue'),
    },
    {
      path: '/',
      name: 'scoring',
      component: () => import('../views/ScoringView/ScoringView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/export',
      name: 'export',
      component: () => import('../views/ExportView/ExportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && auth.isLoggedIn) {
    /* 根据角色跳转到不同首页 */
    if (auth.isExporter) {
      next('/export')
    } else {
      next('/')
    }
  } else {
    next()
  }
})

export default router
