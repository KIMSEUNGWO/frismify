import {pluginRegistry} from "@/plugins/registry";
import '@/plugins';
import { settingsManager } from '@/utils/settings-manager';

export default defineBackground(async () => {
  console.log('🚀 Background script loaded');

  // SettingsManager 초기화
  await settingsManager.initialize();

  console.log('📦 Registered plugins:', pluginRegistry.findAll().map(p => p.meta.name));

  // Popup/Options에서 플러그인 enabled 상태 변경 메시지 처리
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'TOGGLE_PLUGIN') {
      const { pluginId, enabled } = message;

      console.log(`${enabled ? '✅' : '❌'} Plugin ${pluginId}: ${enabled ? 'enabled' : 'disabled'}`);

      // 상태 저장
      await settingsManager.setPluginEnabled(pluginId, enabled);

      return { success: true };
    }
  });
});
