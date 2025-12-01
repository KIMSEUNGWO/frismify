import {createRouter, createMemoryHistory} from 'vue-router'

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/example-plugin',
            component: () => import('@/plugins/implementations/example/ExampleModalView.vue'),
        },
        {
            path: '/copy-breaker',
            component: () => import('@/plugins/implementations/copy-breaker/CopyBreakerModalView.vue'),
        },
        {
            path: '/color-picker',
            component: () => import('@/plugins/implementations/color-picker/ColorPickerModalView.vue'),
        },
    ],
})


export default router;
