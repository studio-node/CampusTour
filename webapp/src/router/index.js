import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import AnalyticsData from '../pages/AnalyticsData.vue'
import UserManagement from '../pages/UserManagement.vue'
import ProfileSettings from '../pages/ProfileSettings.vue'
import TourManagement from '../pages/TourManagement.vue'
import AmbassadorTours from '../pages/AmbassadorTours.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Dashboard' }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: AnalyticsData,
    meta: { title: 'Analytics & Data' }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { title: 'User Management' }
  },
  {
    path: '/profile',
    name: 'ProfileSettings',
    component: ProfileSettings,
    meta: { title: 'Profile & Settings' }
  },
  {
    path: '/tours',
    name: 'TourManagement',
    component: TourManagement,
    meta: { title: 'Tour Management' }
  },
  {
    path: '/ambassador-tours',
    name: 'AmbassadorTours',
    component: AmbassadorTours,
    meta: { title: 'Ambassador Tours' }
  },
  {
    // Redirect any unknown routes to dashboard
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Optional: Update document title based on route
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `Campus Tour Admin - ${to.meta.title}` : 'Campus Tour Admin'
  next()
})

export default router 