import {createRouter, createWebHistory, createWebHashHistory} from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            component: () => import('@/entrypoints/options/pages/DashboardView.vue'),
        },
        {
            path: '/tools',
            component: () => import('@/entrypoints/options/pages/ToolsView.vue'),
        },
        {
            path: '/shortcuts',
            component: () => import('@/entrypoints/options/pages/ShortcutsView.vue'),
        },
    ],
})


export default router;