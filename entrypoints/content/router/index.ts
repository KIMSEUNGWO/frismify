import {createRouter, createMemoryHistory} from 'vue-router'

// 모달마다 독립적인 router 인스턴스를 생성하기 위한 routes 정의
const routes = [
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
    {
        path: '/asset-spy',
        component: () => import('@/plugins/implementations/asset-spy/AssetSpyModalView.vue'),
    },
];

// 각 모달마다 새로운 router 인스턴스를 생성하는 factory 함수
export function createModalRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes,
    });
}

// 기본 export (하위 호환성)
export default createModalRouter();
