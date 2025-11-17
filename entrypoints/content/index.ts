import { pluginRegistry } from '@/plugins/registry';
import type { Plugin } from '@/plugins/types';
import '@/plugins';
import { settingsManager } from '@/utils/settings-manager';
import { matchesShortcut } from '@/utils/shortcut-utils';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main(ctx) {
    console.log('🎯 Content script loaded');

    // SettingsManager 초기화
    await settingsManager.initialize();

    // 모든 플러그인 로드
    const plugins = pluginRegistry.findAll();
    console.log(`📦 Found ${plugins.length} plugins`);

    // onActivate가 있는 플러그인 실행
    for (const plugin of plugins) {
      if (plugin.executor.onActivate) {
        try {
          await plugin.executor.onActivate(ctx);
          console.log(`✅ Plugin activated: ${plugin.meta.name}`);
        } catch (error) {
          console.error(`❌ Failed to activate plugin ${plugin.meta.id}:`, error);
        }
      }
    }

    // 전역 단축키 핸들러
    const handleShortcut = async (event: KeyboardEvent) => {
      for (const plugin of plugins) {
        // 1. 플러그인이 enabled 상태인지 확인
        if (!settingsManager.isPluginEnabled(plugin.meta.id)) {
          continue;
        }

        // 2. 플러그인에 단축키가 있는지 확인
        if (!plugin.meta.shortcuts || plugin.meta.shortcuts.length === 0) {
          continue;
        }

        // 3. 각 단축키 확인
        for (const shortcut of plugin.meta.shortcuts) {
          // 3-1. 단축키가 enabled 상태인지 확인
          const shortcutConfig = settingsManager.getPluginConfig(plugin.meta.id)?.shortcuts?.[shortcut.id];
          if (shortcutConfig?.enabled === false) {
            continue;
          }

          // 3-2. 커스텀 단축키가 있으면 사용, 없으면 기본 단축키 사용
          const keys = shortcut.key; // TODO: 커스텀 단축키 처리

          // 3-3. 단축키 매칭 확인
          if (matchesShortcut(event, keys)) {
            event.preventDefault();
            event.stopPropagation();

            console.log(`⌨️ Shortcut triggered: ${plugin.meta.name} - ${shortcut.name}`);

            try {
              await shortcut.handler(event, ctx);
            } catch (error) {
              console.error(`❌ Shortcut handler error (${plugin.meta.id}.${shortcut.id}):`, error);
            }

            return; // 첫 번째 매칭된 단축키만 실행
          }
        }
      }
    };

    // 전역 keydown 이벤트 리스너 등록
    document.addEventListener('keydown', handleShortcut, true);

    // Context 무효화 시 정리
    ctx.onInvalidated(() => {
      console.log('🧹 Context invalidated, cleaning up');
      document.removeEventListener('keydown', handleShortcut, true);

      // 모든 플러그인 cleanup 호출
      for (const plugin of plugins) {
        if (plugin.cleanup) {
          try {
            plugin.cleanup();
          } catch (error) {
            console.error(`❌ Cleanup error (${plugin.meta.id}):`, error);
          }
        }
      }
    });
  },
});