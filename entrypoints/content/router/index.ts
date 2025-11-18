import {createRouter, createWebHistory, createWebHashHistory} from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/example-plugin',
            component: () => import('@/plugins/implementations/example/ExampleModalView.vue'),
        },
    ],
})


export default router;
