import {pluginRegistry} from "@/plugins/registry";
import '@/plugins/implementations';


export default defineBackground(async () => {
  console.log('🚀 Background script loaded');

  console.log('📦 Registered plugins:', pluginRegistry.findAll().map(p => p.meta.name));

  browser.commands.onCommand.addListener(async (command) => {
    console.log('⌨️ Command received:', command);

    const pluginId = pluginRegistry.findByIdFromCommand(command);
    if (!pluginId) {
      console.warn('❌ Unknown command:', command);
      return;
    }

    const plugin = pluginRegistry.findById(pluginId);
    if (!plugin) {
      console.warn('❌ Plugin not found:', pluginId);
      return;
    }

    // 현재 상태 토글
    const currentState = await storage.getItem<boolean>(
        `local:plugin:${pluginId}`
    );
    const newState = !currentState;

    // 상태 저장
    await storage.setItem(`local:plugin:${pluginId}`, newState)

    console.log(`${newState ? '✅' : '❌'} Plugin ${plugin.meta.name}: ${newState ? 'enabled' : 'disabled'}`);

    // 모든 활성 탭에 메시지 전송
    const tabs = await browser.tabs.query({});

    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: 'UPDATE_PLUGIN',
            pluginId,
            enabled: newState,
          });
        } catch (error) {
          // Content script가 없는 탭은 무시
        }
      }
    }

    // 알림 표시 (욥션)
    browser.notifications?.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title: plugin.meta.name,
      message: newState ? '활성화되었습니다' : '비활성화되었습니다',
    });

    // Popup/Options에서 수동 토글 메시지 처리
    browser.runtime.onMessage.addListener(async (message, sender) => {
      if (message.type === 'TOGGLE_PLUGIN') {
        const { pluginId, enabled } = message;

        console.log(`${enabled ? '✅' : '❌'} Plugin ${pluginId}: ${enabled ? 'enabled' : 'disabled'}`);

        // 모든 활성 탭에 메시지 전송

        const tabs = await browser.tabs.query({});

        for (const tab of tabs) {
          if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
            try {
              await browser.tabs.sendMessage(tab.id, {
                type: 'UPDATE_PLUGIN',
                pluginId,
                enabled,
              });
            } catch (error) {
              console.log(`Tab ${tab.id} has no content script`);
            }
          }
        }

        return { success: true };
      }
    })


  })
});
