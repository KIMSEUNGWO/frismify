import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

/**
 * GET_SEGMENT_URL_LIST Command
 *
 * M3U8 URL을 파싱하여 세그먼트 URL 목록을 반환합니다.
 */
export class GetSegmentUrlListCommand implements Command<MessageType.GET_SEGMENT_URL_LIST> {
  readonly type = MessageType.GET_SEGMENT_URL_LIST;

  async execute(
    request: { m3u8Url: string },
    context: CommandContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const parsed = await context.backgroundFetchService.parseM3U8(request.m3u8Url);

      return {
        success: true,
        data: parsed,
      };
    } catch (error) {
      console.error('❌ Failed to parse M3U8:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
