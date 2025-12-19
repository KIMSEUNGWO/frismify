import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class UpdateSettingCommand implements Command<MessageType.UPDATE_SETTING> {
  readonly type = MessageType.UPDATE_SETTING;

  async execute(
    request: { pluginId: string; settingId: string; value: any },
    context: CommandContext
  ) {
    await context.pluginManager.updateSetting(
      request.pluginId,
      request.settingId,
      request.value
    );
    console.log(`✅ Plugin ${request.pluginId} setting ${request.settingId} updated`);
    return { success: true };
  }
}
