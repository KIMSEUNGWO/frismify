import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

export class GetFileSizeCommand implements Command<MessageType.GET_FILE_SIZE> {
  readonly type = MessageType.GET_FILE_SIZE;

  async execute(request: { url: string }, context: CommandContext) {
    try {
      const response = await fetch(request.url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : null;
      return { size };
    } catch (error) {
      console.error(`❌ Failed to get file size:`, error);
      return { size: null };
    }
  }
}
