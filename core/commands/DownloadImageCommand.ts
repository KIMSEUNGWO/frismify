import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class DownloadImageCommand implements Command<MessageType.DOWNLOAD_IMAGE> {
  readonly type = MessageType.DOWNLOAD_IMAGE;

  async execute(request: { url: string; filename: string }, context: CommandContext) {
    try {
      await browser.downloads.download({
        url: request.url,
        filename: request.filename,
        saveAs: false,
      });
      console.log(`✅ Download started: ${request.filename}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Download failed:`, error);
      return { success: false };
    }
  }
}
