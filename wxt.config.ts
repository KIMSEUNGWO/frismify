import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Frontend Dev Toolkit',
    description: '프론트엔드 개발자를 위한 올인원 툴킷',
    permissions: [
      'storage',        // 플러그인 상태 저장
      'activeTab',      // 현재 탭 접근
      'scripting',      // 동적 스크립트 주입
      'tabs',
    ],
    host_permissions: ['<all_urls>'], // 모든 사이트에서 작동
  },
  modules: ['@wxt-dev/module-vue'],
  hooks: {
    'build:manifestGenerated': async (wxt, manifest) => {
      // Add open_in_tab to options_ui
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }

      // 단축키는 content script의 keydown 리스너에서 처리
      // manifest.json에 등록하면 Chrome이 먼저 가로채서 이벤트가 안 옴
      console.log('🔧 Shortcuts will be handled by content script keydown listener');
    },
  },

  vite: () => ({
    resolve: {
      alias: {
        '@': '',
      },
    },
  }),
});
