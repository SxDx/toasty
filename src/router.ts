import { createRouter, createWebHistory } from 'vue-router'
import StandupView from './views/StandupView.vue'
import PeopleView from './views/PeopleView.vue'
import HistoryView from './views/HistoryView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: StandupView },
    { path: '/people', component: PeopleView },
    { path: '/history', component: HistoryView },
  ],
})

export default router
