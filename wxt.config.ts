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

      // 플러그인 레지스트리에서 동적으로 단축키 생성
      const { initializePlugins } = await import('./plugins/implementations/index');
      const registry = initializePlugins();

      // 레지스트리에서 commands 가져오기
      const commands = registry.getCommands();

      console.log('🔧 Auto-generating keyboard shortcuts...');
      console.log(`📋 Total shortcuts: ${Object.keys(commands).length}`);
      console.log('Commands:', JSON.stringify(commands, null, 2));

      // manifest에 commands 추가
      manifest.commands = {
        ...manifest.commands,
        ...commands,
      };
    },
  },


  vite: () => ({
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }),
});
