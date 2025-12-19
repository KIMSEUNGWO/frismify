import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class OpenModalCommand implements Command<MessageType.OPEN_MODAL> {
  readonly type = MessageType.OPEN_MODAL;

  async execute(request: { pluginId: string }, context: CommandContext) {
    // Content Script로 메시지 전송
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: MessageType.OPEN_MODAL,
        pluginId: request.pluginId,
      });
    }
    console.log(`✅ Plugin ${request.pluginId} open modal message sent`);
    return { success: true };
  }
}
