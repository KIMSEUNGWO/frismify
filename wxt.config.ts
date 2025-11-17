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

      // 플러그인 매니저에서 동적으로 단축키 생성
      console.log('🔧 Generating keyboard shortcuts from PluginManager...');

      try {
        // 동적 import로 PluginManager와 plugins 가져오기
        const { PluginManager } = await import('./core/PluginManager');
        const { registerPlugins } = await import('./plugins/index');

        const manager = PluginManager.getInstance();
        await registerPlugins();

        const commands = manager.getCommands();

        console.log(`📋 Total shortcuts: ${Object.keys(commands).length}`);
        console.log('Commands:', JSON.stringify(commands, null, 2));

        // manifest에 commands 추가
        manifest.commands = {
          ...manifest.commands,
          ...commands,
        };
      } catch (error) {
        console.error('❌ Failed to generate commands:', error);
      }
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
