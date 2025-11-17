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

  const manager = PluginManager.getInstance();

  // 플러그인 등록
  await registerPlugins();

  console.log('📦 Registered plugins:', manager.getPlugins().map(p => p.name));

  // Popup/Options에서 플러그인 toggle 메시지 처리
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'TOGGLE_PLUGIN') {
      const { pluginId } = message;

      try {
        await manager.togglePlugin(pluginId);
        console.log(`✅ Plugin ${pluginId} toggled`);
        return { success: true };
      } catch (error) {
        console.error(`❌ Failed to toggle plugin ${pluginId}:`, error);
        return { success: false, error: String(error) };
      }
    }
  });

  // Chrome Commands (단축키) 처리
  // 참고: Content Script에서도 단축키를 처리하므로 여기서는 주석 처리
  // browser.commands.onCommand.addListener(async (command) => {
  //   console.log(`⌨️ Command received: ${command}`);
  //   await manager.handleCommand(command, null as any); // Background에서는 ctx 없음
  // });
});
