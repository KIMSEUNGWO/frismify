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

  // Popup/Options에서 플러그인 toggle 메시지 처리
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'TOGGLE_PLUGIN') {
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

    if (message.type === 'OPEN_MODAL') {
      const { pluginId } = message;

      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true});
        if (tabs[0]?.id) {
          await browser.tabs.sendMessage(tabs[0].id!, {
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

    if (message.type === 'EXECUTE_PLUGIN') {
      const { pluginId } = message;

      try {
        // Content script로 메시지 전송
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

  });

  // Chrome Commands (단축키) 처리
  // browser.commands.onCommand.addListener(async (command) => {
  //   console.log(`⌨️ Command received in background: ${command}`);
  //
  //   const parsed = manager.parseCommand(command);
  //   if (!parsed) return;
  //
  //   // Content script로 메시지 전송
  //   const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  //   if (tabs[0]?.id) {
  //     browser.tabs.sendMessage(tabs[0].id, {
  //       type: 'EXECUTE_SHORTCUT',
  //       pluginId: parsed.pluginId,
  //       shortcutId: parsed.shortcutId,
  //     });
  //   }
  // });
});
