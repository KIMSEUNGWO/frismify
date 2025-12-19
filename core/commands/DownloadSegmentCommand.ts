import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

/**
 * DOWNLOAD_SEGMENT Command
 *
 * HLS 세그먼트를 다운로드하고 base64로 인코딩하여 반환합니다.
 */
export class DownloadSegmentCommand implements Command<MessageType.DOWNLOAD_SEGMENT> {
  readonly type = MessageType.DOWNLOAD_SEGMENT;

  async execute(
    request: { segmentUrl: string },
    context: CommandContext
  ) {
    try {
      const arrayBuffer = await context.backgroundFetchService.downloadSegment(request.segmentUrl);

      // ArrayBuffer를 base64로 인코딩
      const base64 = this.arrayBufferToBase64(arrayBuffer);

      return {
        success: true,
        data: base64,
      };
    } catch (error) {
      console.error('❌ Failed to download segment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * ArrayBuffer를 base64 문자열로 변환
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
