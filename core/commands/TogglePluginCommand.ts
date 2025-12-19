import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class TogglePluginCommand implements Command<MessageType.TOGGLE_PLUGIN> {
  readonly type = MessageType.TOGGLE_PLUGIN;

  async execute(request: { pluginId: string }, context: CommandContext) {
    await context.pluginManager.togglePlugin(request.pluginId);
    console.log(`✅ Plugin ${request.pluginId} toggled`);
    return { success: true };
  }
}
