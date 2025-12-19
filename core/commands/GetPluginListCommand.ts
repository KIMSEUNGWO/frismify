import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetPluginListCommand implements Command<MessageType.GET_PLUGIN_LIST> {
  readonly type = MessageType.GET_PLUGIN_LIST;

  async execute(request: void, context: CommandContext) {
    return {
      plugins: context.pluginRegistry.getAll(),
    };
  }
}
