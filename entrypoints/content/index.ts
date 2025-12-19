/**
 * Content Script
 *
 * 역할:
 * - Background로부터 상태를 구독하여 플러그인 실행 (공유)
 * - Modal 제어 (비공유 - 각 탭 독립)
 * - 단축키 핸들링
 * - Context 무효화 시 cleanup
 *
 * 중요: 플러그인 등록은 Background에서만! (Single Source of Truth)
 */

import {EventManager, ShortcutManager} from '@/core';
import { allPlugins } from '@/plugins';
import { pluginManagerProxy } from '@/core/proxy/PluginManagerProxy';

import '@/assets/styles/main.css';
import '@/assets/fonts/fonts.css'
import '@/plugins';
import {modalManager} from "@/core/ModalManager";
import {isExecutablePlugin} from "@/types";
import {MessageType} from "@/core/InstanceManager";
import {ActiveManager} from "@/core/ResourceManagers";

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main(ctx) {
    console.log('🎯 Content script loaded');

    const shortcut = ShortcutManager.getInstance();
    const eventManager = new EventManager();
    const activeManager = new ActiveManager();

    console.log(`📦 Found ${allPlugins.length} plugins`);

    /* Initialize */
    modalManager.initialize(ctx, allPlugins);
    await activeManager.initialize(ctx, allPlugins);


    // Background에서 플러그인 실행 메시지 처리
    browser.runtime.onMessage.addListener(async (message) => {
      switch (message.type) {
        case MessageType.EXECUTE_PLUGIN : {
          const { pluginId } = message;
          console.log(`🚀 Executing plugin: ${pluginId}`);

          const plugin = allPlugins.find(p => p.id === pluginId);
          if (plugin && isExecutablePlugin(plugin)) {
            await plugin.onExecute(ctx);
          }

          break;
        }

        case MessageType.OPEN_MODAL: {
          const { pluginId } = message;
          await openModal(pluginId);
          break;
        }
      }

    });

    // 전역 단축키 핸들러
    const handleShortcut = async (event: KeyboardEvent) => {
      for (const plugin of allPlugins) {
        const state = await pluginManagerProxy.getPluginState(plugin.id);
        if (!state?.shortcuts) continue;

        // 1. 등록된 단축키 확인 (onExecute의 'execute' 포함)
        for (const [shortcutId, shortcutState] of Object.entries(state.shortcuts)) {
          // 단축키가 등록되지 않았으면 스킵
          if (!shortcutState.keys || shortcutState.keys.length === 0) continue;

          // Chrome storage에서 배열이 객체로 변환될 수 있으므로 배열로 변환
          const keys : string[] = Array.isArray(shortcutState.keys)
            ? shortcutState.keys
            : Object.values(shortcutState.keys);

          // 단축키 매칭 확인
          const isMatch = shortcut.matches(event, keys);

          if (!isMatch) continue;

          event.preventDefault();
          event.stopPropagation();

          // execute shortcut 처리
          if (shortcutId === 'execute' && isExecutablePlugin(plugin)) {
            console.log(`⌨️ Execute shortcut triggered: ${plugin.name}`);
            await plugin.onExecute(ctx);
            return;
          }

          // 일반 shortcut 처리 (enabled 상태 확인)
          if (!state.enabled) {
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
    };

    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      switch (event.data.type) {

        case MessageType.GET_SEGMENT_URL_LIST: {
          browser.runtime.sendMessage({
            type: MessageType.GET_SEGMENT_URL_LIST_RESULT,
            data: event.data.data,
            requestId: event.data.requestId,
          });
          break;
        }

        case 'DOWNLOAD_SEGMENT': {
          browser.runtime.sendMessage({
            type: MessageType.DOWNLOAD_SEGMENT_RESULT,
            data: event.data.data,
            error: event.data.error,
            requestId: event.data.requestId,
          });
          break;
        }
      }
    });


    // 전역 keydown 이벤트 리스너 등록
    eventManager.add(document, 'keydown', handleShortcut, true);

    // Context 무효화 시 정리 (비공유 - 이 탭에서 activate된 것만 cleanup)
    ctx.onInvalidated(async () => {
      console.log('🧹 Context invalidated, cleaning up');
      eventManager.removeAll();
      // 이 탭에서 activate된 플러그인들만 cleanup
      await activeManager.invalidated();
    });
  },
});


async function openModal(pluginId: string) {
  await modalManager.openModal(pluginId);
  console.log("🔧 Mount finished");
}
