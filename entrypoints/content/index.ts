import { pluginRegistry } from '@/plugins/registry';
import type { Plugin } from '@/plugins/types';
import '@/plugins/implementations';  // 플러그인 등록

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main(ctx) {
    console.log('🎯 Content script loaded');

    const activePlugins = new Map<string, Plugin>();

    // 플러그인 활성화
    const activatePlugin = async (plugin: Plugin) => {
      if (activePlugins.has(plugin.meta.id)) {
        console.log(`⚠️ Plugin ${plugin.meta.name} already active`);
        return;
      }

      try {
        await plugin.execute(ctx);
        activePlugins.set(plugin.meta.id, plugin);
        console.log(`✅ Plugin activated: ${plugin.meta.name}`);
      } catch (error) {
        console.error(`❌ Failed to activate ${plugin.meta.name}:`, error);
      }
    }

    // 플러그인 비활성화
    const deactivatePlugin = async (pluginId: string) => {
      const plugin = activePlugins.get(pluginId);
      if (!plugin) {
        console.log(`⚠️ Plugin ${pluginId} not active`);
        return;
      }

      try {
        await plugin.cleanup?.();
        activePlugins.delete(pluginId);
        console.log(`❌ Plugin deactivated: ${plugin.meta.name}`);
      } catch (error) {
        console.error(`❌ Failed to deactivate ${plugin.meta.name}:`, error);
      }
    }

    // 초기 플러그인 로드
    const plugins = pluginRegistry.findAll();
    console.log(`📦 Found ${plugins.length} plugins`);

    for (const plugin of plugins) {
      const result = await browser.storage.local.get(`local:plugin:${plugin.meta.id}`);
      const enabled = result[`local:plugin:${plugin.meta.id}`] || false;

      if (enabled) {
        await activatePlugin(plugin);
      }
    }

    // 메시지 리스너: 런타임에 플러그인 토글
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'UPDATE_PLUGIN') {
        const { pluginId, enabled } = message;
        const plugin = pluginRegistry.findById(pluginId);

        if (!plugin) {
          console.error(`❌ Plugin ${pluginId} not found`);
          return;
        }

        if (enabled) {
          activatePlugin(plugin);
        } else {
          deactivatePlugin(pluginId)
        }
      }
    })

    // Context 무효화 시 모든 플러그인 정리
    ctx.onInvalidated(() => {
      console.log('🧹 Context invalidated, cleaning up plugins');
      for (const [pluginId] of activePlugins) {
        deactivatePlugin(pluginId);
      }
    });

  },
});

// contextmenu event -> 오른쪽 클릭 해제
