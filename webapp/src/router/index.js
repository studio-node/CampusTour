import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import AnalyticsData from '../pages/AnalyticsData.vue'
import UserManagement from '../pages/UserManagement.vue'
import ProfileSettings from '../pages/ProfileSettings.vue'
import TourManagement from '../pages/TourManagement.vue'
import AmbassadorTours from '../pages/AmbassadorTours.vue'

// Layouts
import PublicLayout from '../components/PublicLayout.vue'
import AdminLayout from '../components/AdminLayout.vue'

const routes = [
  // Public routes
  {
    path: '/',
    redirect: '/select-school'
  },
  {
    path: '/select-school',
    name: 'SchoolSelection',
    component: () => import('../pages/SchoolSelection.vue'),
    meta: { 
      layout: 'public',
      title: 'Select Your School' 
    }
  },
  {
    path: '/select-interests',
    name: 'InterestSelection',
    component: () => import('../pages/InterestSelection.vue'),
    meta: { 
      layout: 'public',
      title: 'Select Your Interests' 
    }
  },
  
  // Admin routes group
  {
    path: '/admin',
    name: 'Dashboard', 
    component: Dashboard,
    meta: { 
      layout: 'admin',
      title: 'Dashboard' 
    }
  },
  {
    path: '/admin/analytics',
    name: 'Analytics',
    component: AnalyticsData,
    meta: { 
      layout: 'admin',
      title: 'Analytics & Data' 
    }
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { 
      layout: 'admin',
      title: 'User Management' 
    }
  },
  {
    path: '/admin/profile',
    name: 'ProfileSettings',
    component: ProfileSettings,
    meta: { 
      layout: 'admin',
      title: 'Profile & Settings' 
    }
  },
  {
    path: '/admin/tours',
    name: 'TourManagement',
    component: TourManagement,
    meta: { 
      layout: 'admin',
      title: 'Tour Management' 
    }
  },
  {
    path: '/admin/ambassador-tours',
    name: 'AmbassadorTours',
    component: AmbassadorTours,
    meta: { 
      layout: 'admin',
      title: 'Ambassador Tours' 
    }
  },
  {
    // Redirect any unknown routes to school selection
    path: '/:pathMatch(.*)*',
    redirect: '/select-school'
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