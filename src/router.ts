import { createRouter, createWebHistory } from 'vue-router'
import StandupView from './views/StandupView.vue'
import PeopleView from './views/PeopleView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: StandupView },
    { path: '/people', component: PeopleView },
  ],
})

export default router
