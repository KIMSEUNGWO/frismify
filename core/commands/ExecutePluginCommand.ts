import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class ExecutePluginCommand implements Command<MessageType.EXECUTE_PLUGIN> {
  readonly type = MessageType.EXECUTE_PLUGIN;

  async execute(request: { pluginId: string }, context: CommandContext) {
    // Content Script로 메시지 전송
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: MessageType.EXECUTE_PLUGIN,
        pluginId: request.pluginId,
      });
    }
    console.log(`✅ Plugin ${request.pluginId} execute message sent`);
    return { success: true };
  }
}
