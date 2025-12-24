import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import { MessageType } from '@/core/InstanceManager';

/**
 * GET_SEGMENT_URL_LIST Command
 *
 * M3U8 URL을 파싱하여 세그먼트 URL 목록을 반환합니다.
 *
 * CORS/403 우회를 위해 Page Script에서 fetch를 수행합니다.
 * Page Script는 원본 사이트의 origin/referer를 사용하므로 인증 문제가 발생하지 않습니다.
 */
export class GetSegmentUrlListCommand implements Command<MessageType.GET_SEGMENT_URL_LIST> {
  readonly type = MessageType.GET_SEGMENT_URL_LIST;

  async execute(
    request: { m3u8Url: string },
    context: CommandContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const tabId = context.sender?.tab?.id;

      if (!tabId) {
        throw new Error('No valid tabId found');
      }

      // Page Script에서 fetch 수행 (CORS/403 우회)
      const results = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN', // Page context에서 실행
        func: async (url: string) => {
          try {
            const res = await fetch(url);
            const text = await res.text();

            // Parse M3U8
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

            const result: any = {
              segments: [],
              audioSegments: [],
              videoSegments: [],
              hasAudioTrack: false,
              hasVideoTrack: false,
            };

            let currentAudioUrl: string | null = null;
            let currentVideoUrl: string | null = null;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              // Audio track
              if (line.startsWith('#EXT-X-MEDIA:')) {
                if (line.includes('TYPE=AUDIO')) {
                  result.hasAudioTrack = true;
                  const uriMatch = line.match(/URI="([^"]+)"/);
                  if (uriMatch) {
                    currentAudioUrl = uriMatch[1].startsWith('http')
                      ? uriMatch[1]
                      : baseUrl + uriMatch[1];
                  }
                }
              }

              // Video variants
              if (line.startsWith('#EXT-X-STREAM-INF:')) {
                result.hasVideoTrack = true;
                const nextLine = lines[i + 1];
                if (nextLine && !nextLine.startsWith('#')) {
                  currentVideoUrl = nextLine.startsWith('http')
                    ? nextLine
                    : baseUrl + nextLine;
                }
              }

              // Segment URLs
              if (!line.startsWith('#') && (line.endsWith('.ts') || line.endsWith('.m4s'))) {
                const segmentUrl = line.startsWith('http') ? line : baseUrl + line;
                result.segments.push(segmentUrl);
              }
            }

            // Master playlist URLs
            if (result.hasAudioTrack && currentAudioUrl) {
              result.audioPlaylistUrl = currentAudioUrl;
            }
            if (result.hasVideoTrack && currentVideoUrl) {
              result.videoPlaylistUrl = currentVideoUrl;
            }

            return result;
          } catch (error) {
            throw new Error(`Failed to fetch M3U8: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
        args: [request.m3u8Url],
      });

      if (!results || results.length === 0) {
        throw new Error('Script execution failed');
      }

      const data = results[0].result;

      return {
        success: true,
        data,
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
