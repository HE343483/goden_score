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
      name: 'login',
      component: () => import('../views/LoginView/LoginView.vue'),
    },
    {
      path: '/scoring',
      name: 'scoring',
      component: () => import('../views/ScoringView/ScoringView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/export',
      component: () => import('../views/Export/ExportNavbar/ExportNavbar.vue'),
      meta: { requiresAuth: true },
      redirect: '/export/list',
      children: [
        {
          path: 'list',
          name: 'export',
      component: () => import('../views/Export/ExportView/ExportView.vue'),
        },
        {
          path: 'experts',
          name: 'experts',
          component: () => import('../views/Export/ExpertAccountManagement/ExpertAccountManagement.vue'),
        },
      ],
    },
    {
      path: '/',
      redirect: '/',
    },
  ],
})

router.beforeEach((to, _from) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return '/'
  }
  if (to.path === '/' && auth.isLoggedIn) {
    /* 根据角色跳转到不同首页 */
    if (auth.isAdmin) {
      return '/export'
    } else {
      return '/scoring'
    }
  }
})

export default router
