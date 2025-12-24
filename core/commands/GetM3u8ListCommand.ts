/**
 * GetM3u8ListCommand
 *
 * 현재 탭에서 감지된 M3U8 URL 목록을 반환합니다.
 */

import type { Command } from './Command';
import type { CommandContext } from './CommandContext';
import type { MessageRequest, MessageResponse } from '@/core/types/messages';
import { MessageType } from '@/core/InstanceManager';
import { detectedM3u8Map } from '@/plugins/implementations/hls-downloader';

export class GetM3u8ListCommand implements Command<MessageType.GET_M3U8_LIST> {
  readonly type = MessageType.GET_M3U8_LIST;

  async execute(
    request: MessageRequest<MessageType.GET_M3U8_LIST>,
    context: CommandContext
  ): Promise<MessageResponse<MessageType.GET_M3U8_LIST>> {
    let tabId: number | undefined;

    // 1. request에서 tabId 가져오기 (명시적 전달)
    if (request.tabId) {
      tabId = request.tabId;
    }
    // 2. sender 정보에서 tabId 가져오기
    else if (context.sender?.tab?.id) {
      tabId = context.sender.tab.id;
    }
    // 3. 현재 활성 탭 가져오기 (fallback)
    else {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      tabId = tab?.id;
    }

    if (!tabId) {
      console.warn('[GetM3u8ListCommand] No valid tabId found');
      return { m3u8List: [] };
    }

    // detectedM3u8Map에서 tabId에 해당하는 VideoItem 목록 가져오기
    const m3u8List = detectedM3u8Map.get(tabId) || [];

    console.log(`[GetM3u8ListCommand] Tab ${tabId}: Found ${m3u8List.length} videos`);

    return { m3u8List };
  }
}
