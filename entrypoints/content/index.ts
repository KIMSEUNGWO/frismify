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

    // 전역 단축키 핸들러
    const handleShortcut = async (event: KeyboardEvent) => {
      for (const plugin of plugins) {
        // 1. 플러그인이 enabled 상태인지 확인
        const isEnabled = await manager.isEnabled(plugin.id);
        if (!isEnabled) {
          console.log(`[Content] Plugin ${plugin.id} is disabled, skipping`);
          continue;
        }

        // 2. 플러그인에 단축키가 있는지 확인
        if (!plugin.shortcuts) continue;

        // 3. 각 단축키 확인
        for (const [shortcutId, shortcutDef] of Object.entries(plugin.shortcuts)) {
          // 3-1. 단축키 상태 확인
          const state = await manager.getPluginState(plugin.id);
          const shortcutState = state?.shortcuts[shortcutId];

          console.log(`[Content] Checking shortcut ${plugin.id}.${shortcutId}:`, {
            shortcutState,
            enabled: shortcutState?.enabled,
          });

          if (shortcutState?.enabled === false) {
            console.log(`[Content] Shortcut ${shortcutId} is disabled`);
            continue;
          }

          // 3-2. 커스텀 단축키가 있으면 사용, 없으면 기본 단축키 사용
          // Chrome storage에서 배열이 객체로 변환될 수 있으므로 배열로 변환
          let keys = shortcutDef.keys;
          if (shortcutState?.keys) {
            keys = Array.isArray(shortcutState.keys)
              ? shortcutState.keys
              : Object.values(shortcutState.keys);
          }

          console.log(`[Content] Testing keys:`, {
            keys,
            isArray: Array.isArray(keys),
            customKeys: shortcutState?.keys,
            defaultKeys: shortcutDef.keys,
          });

          // 디버깅: 키 이벤트 정보 출력
          console.log(`[Content] KeyboardEvent:`, {
            key: event.key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          });

          // 3-3. 단축키 매칭 확인
          const isMatch = shortcut.matches(event, keys);
          console.log(`[Content] Match result:`, isMatch);

          if (isMatch) {
            event.preventDefault();
            event.stopPropagation();

            console.log(`⌨️ Shortcut triggered: ${plugin.name} - ${shortcutDef.name}`);

            try {
              await shortcutDef.handler(event, ctx);
            } catch (error) {
              console.error(`❌ Shortcut handler error (${plugin.id}.${shortcutId}):`, error);
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
