/**
 * Content Script
 *
 * 역할:
 * - 플러그인 등록
 * - 활성화된 플러그인 activate
 * - 단축키 핸들링
 * - Context 무효화 시 cleanup
 */

import { PluginManager, ShortcutManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main(ctx) {
    console.log('🎯 Content script loaded');

    const manager = PluginManager.getInstance();
    const shortcut = ShortcutManager.getInstance();

    // 플러그인 등록
    await registerPlugins();

    const plugins = manager.getPlugins();
    console.log(`📦 Found ${plugins.length} plugins`);

    // 활성화된 플러그인 activate
    for (const plugin of plugins) {
      const isEnabled = await manager.isEnabled(plugin.id);
      if (isEnabled && plugin.onActivate) {
        try {
          await manager.activate(plugin.id, ctx);
          console.log(`✅ Plugin activated: ${plugin.name}`);
        } catch (error) {
          console.error(`❌ Failed to activate plugin ${plugin.id}:`, error);
        }
      }
    }

    // Background에서 플러그인 실행 메시지 처리
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'EXECUTE_PLUGIN') {
        const { pluginId } = message;
        console.log(`🚀 Executing plugin: ${pluginId}`);
        manager.executePlugin(pluginId, ctx);
      }
    });

    // 전역 단축키 핸들러
    const handleShortcut = async (event: KeyboardEvent) => {
      for (const plugin of plugins) {
        const state = await manager.getPluginState(plugin.id);
        if (!state?.shortcuts) continue;

        // 1. 등록된 단축키 확인 (onExecute의 'execute' 포함)
        for (const [shortcutId, shortcutState] of Object.entries(state.shortcuts)) {
          // 단축키가 등록되지 않았으면 스킵
          if (!shortcutState.keys || shortcutState.keys.length === 0) continue;

          // Chrome storage에서 배열이 객체로 변환될 수 있으므로 배열로 변환
          const keys = Array.isArray(shortcutState.keys)
            ? shortcutState.keys
            : Object.values(shortcutState.keys);

          // 단축키 매칭 확인
          const isMatch = shortcut.matches(event, keys);

          if (isMatch) {
            event.preventDefault();
            event.stopPropagation();

            // execute shortcut 처리
            if (shortcutId === 'execute' && plugin.onExecute) {
              console.log(`⌨️ Execute shortcut triggered: ${plugin.name}`);
              await manager.executePlugin(plugin.id, ctx);
              return;
            }

            // 일반 shortcut 처리 (enabled 상태 확인)
            const isEnabled = await manager.isEnabled(plugin.id);
            if (!isEnabled) {
              console.log(`[Content] Plugin ${plugin.id} is disabled, skipping`);
              continue;
            }

            const shortcutDef = plugin.shortcuts?.[shortcutId];
            if (shortcutDef) {
              console.log(`⌨️ Shortcut triggered: ${plugin.name} - ${shortcutDef.name}`);
              try {
                await shortcutDef.handler(event, ctx);
              } catch (error) {
                console.error(`❌ Shortcut handler error (${plugin.id}.${shortcutId}):`, error);
              }
            }

            return; // 첫 번째 매칭된 단축키만 실행
          }
        }
      }
    };

    // 전역 keydown 이벤트 리스너 등록
    document.addEventListener('keydown', handleShortcut, true);

    // Context 무효화 시 정리
    ctx.onInvalidated(async () => {
      console.log('🧹 Context invalidated, cleaning up');
      document.removeEventListener('keydown', handleShortcut, true);

      // 모든 플러그인 cleanup 호출
      await manager.cleanupAll();
    });
  },
});
