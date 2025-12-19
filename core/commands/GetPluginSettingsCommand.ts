import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetPluginSettingsCommand implements Command<MessageType.GET_PLUGIN_SETTINGS> {
  readonly type = MessageType.GET_PLUGIN_SETTINGS;

  async execute(request: { pluginId: string }, context: CommandContext) {
    const settings = await context.pluginManager.getSettings(request.pluginId);
    return { settings };
  }
}
