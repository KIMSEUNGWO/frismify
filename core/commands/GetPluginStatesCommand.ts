import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetPluginStatesCommand implements Command<MessageType.GET_PLUGIN_STATES> {
  readonly type = MessageType.GET_PLUGIN_STATES;

  async execute(request: void, context: CommandContext) {
    const configs = await context.pluginManager.getPluginStates();
    return { configs };
  }
}
