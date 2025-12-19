import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class DisablePluginCommand implements Command<MessageType.DISABLE_PLUGIN> {
  readonly type = MessageType.DISABLE_PLUGIN;

  async execute(request: { pluginId: string }, context: CommandContext) {
    await context.pluginManager.disablePlugin(request.pluginId);
    console.log(`✅ Plugin ${request.pluginId} disabled`);
    return { success: true };
  }
}
