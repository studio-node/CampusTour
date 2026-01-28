import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import AnalyticsData from '../pages/AnalyticsData.vue'
import UserManagement from '../pages/UserManagement.vue'
import ProfileSettings from '../pages/ProfileSettings.vue'
import TourManagement from '../pages/TourManagement.vue'
import LocationManagement from '../pages/LocationManagement.vue'
import AmbassadorTours from '../pages/AmbassadorTours.vue'
import BuilderLocationEdit from '../pages/BuilderLocationEdit.vue'

// Layouts
import PublicLayout from '../components/PublicLayout.vue'
import AdminLayout from '../components/AdminLayout.vue'

const routes = [
  // Landing page (root)
  {
    path: '/',
    name: 'Landing',
    component: () => import('../pages/LandingPage.vue'),
    meta: { 
      layout: 'none',
      title: 'Campus Tour' 
    }
  },
  // Admin sign-in page
  {
    path: '/admin/signin',
    name: 'AdminSignIn',
    component: () => import('../pages/AdminSignIn.vue'),
    meta: { 
      layout: 'none',
      title: 'Admin Sign In' 
    }
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
    path: '/information',
    name: 'Information',
    component: () => import('../pages/Information.vue'),
    meta: { 
      layout: 'public',
      title: 'Your Information' 
    }
  },
  {
    path: '/tour-groups',
    name: 'TourGroups',
    component: () => import('../pages/TourGroups.vue'),
    meta: { 
      layout: 'public',
      title: 'Available Tour Groups' 
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
  {
    path: '/tour-confirmation',
    name: 'TourConfirmation',
    component: () => import('../pages/TourConfirmation.vue'),
    meta: { 
      layout: 'public',
      title: 'Tour Confirmation' 
    }
  },

  // Builder (no-auth) location edit page
  {
    path: '/builder/location/:locationId',
    name: 'BuilderLocationEdit',
    component: BuilderLocationEdit,
    meta: {
      layout: 'public',
      title: 'Update Location'
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
    path: '/admin/locations',
    name: 'LocationManagement',
    component: LocationManagement,
    meta: { 
      layout: 'admin',
      title: 'Location Management' 
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
    // Redirect any unknown routes to landing page
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