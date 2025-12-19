import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetPluginCommand implements Command<MessageType.GET_PLUGIN> {
  readonly type = MessageType.GET_PLUGIN;

  async execute(request: { pluginId: string }, context: CommandContext) {
    const plugin = context.pluginRegistry.get(request.pluginId);
    return { plugin };
  }
}
