/**
 * Background Script
 *
 * 역할:
 * - 플러그인 등록
 * - 플러그인 toggle 메시지 처리
 * - Chrome Commands (단축키) 처리
 */

import { PluginManager } from '@/core';
import { registerPlugins } from '@/plugins';

export default defineBackground(async () => {
  console.log('🚀 Background script loaded');

  const pluginManager = PluginManager.getInstance();

  // 플러그인 등록
  await registerPlugins();

  console.log('📦 Registered plugins:', pluginManager.getPlugins().map(p => p.name));

  // 메시지 핸들러 (Promise 반환 필수)
  const handleMessage = async (message: any, sender: any): Promise<any> => {
    switch (message.type) {
      case 'TOGGLE_PLUGIN': {
        const { pluginId } = message;
        try {
          await pluginManager.togglePlugin(pluginId);
          console.log(`✅ Plugin ${pluginId} toggled`);
          return { success: true };
        } catch (error) {
          console.error(`❌ Failed to toggle plugin ${pluginId}:`, error);
          return { success: false, error: String(error) };
        }
      }

      case 'OPEN_MODAL': {
        const { pluginId } = message;
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
              type: 'OPEN_MODAL',
              pluginId
            });
          }
          console.log(`✅ Plugin ${pluginId} open modal message sent`);
          return { success: true };
        } catch (error) {
          console.error(`❌ Failed to Open Modal ${pluginId}`, error);
          return { success: false, error: String(error) };
        }
      }

      case 'EXECUTE_PLUGIN': {
        const { pluginId } = message;
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, {
              type: 'EXECUTE_PLUGIN',
              pluginId,
            });
            console.log(`✅ Plugin ${pluginId} execute message sent`);
          }
          return { success: true };
        } catch (error) {
          console.error(`❌ Failed to execute plugin ${pluginId}:`, error);
          return { success: false, error: String(error) };
        }
      }

      default:
        return undefined;
    }
  };

  // 리스너 등록
  browser.runtime.onMessage.addListener((message, sender) => {
    return handleMessage(message, sender);
  });
});
