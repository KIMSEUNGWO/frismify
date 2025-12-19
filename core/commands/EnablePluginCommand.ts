import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class EnablePluginCommand implements Command<MessageType.ENABLE_PLUGIN> {
  readonly type = MessageType.ENABLE_PLUGIN;

  async execute(request: { pluginId: string }, context: CommandContext) {
    await context.pluginManager.enablePlugin(request.pluginId);
    console.log(`✅ Plugin ${request.pluginId} enabled`);
    return { success: true };
  }
}
