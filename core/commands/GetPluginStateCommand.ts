import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetPluginStateCommand implements Command<MessageType.GET_PLUGIN_STATE> {
  readonly type = MessageType.GET_PLUGIN_STATE;

  async execute(request: { pluginId: string }, context: CommandContext) {
    const config = await context.pluginManager.getPluginState(request.pluginId);
    return { config };
  }
}
