/**
 * MessageBus - 메시지 통신의 중앙 라우터
 *
 * 역할:
 * - Background: CommandRegistry와 연동하여 메시지 처리
 * - Content/Popup: browser.runtime.sendMessage 래퍼
 */

import type { MessageType } from '@/core/InstanceManager';
import type { CommandRegistry } from './CommandRegistry';
import type { CommandContext } from './commands/CommandContext';
import type { MessageRequest, MessageResponse } from './types/messages';

export class MessageBus {
  private static instance: MessageBus;
  private commandRegistry?: CommandRegistry;
  private context?: CommandContext;

  private constructor() {}

  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  /**
   * Background에서 초기화
   * CommandRegistry를 등록하고 메시지 리스너를 설정합니다.
   *
   * @param registry - CommandRegistry 인스턴스
   * @param context - Command 실행 컨텍스트
   */
  public initializeHandlers(registry: CommandRegistry, context: CommandContext): void {
    this.commandRegistry = registry;
    this.context = context;

    // 메시지 리스너 등록
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // async 로직을 IIFE로 감싸서 실행
      (async () => {
        try {
          if (!this.commandRegistry || !this.context) {
            throw new Error('MessageBus not initialized with CommandRegistry');
          }

          // sender 정보를 context에 추가
          const contextWithSender = {
            ...this.context,
            sender,
          };

          const response = await this.commandRegistry.execute(
            message.type,
            message,
            contextWithSender
          );

          sendResponse(response);
        } catch (error) {
          console.error('[MessageBus] Message handling error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();

      // async response를 위해 true 반환
      return true;
    });

    console.log('[MessageBus] Message handlers initialized');
  }

  /**
   * Content/Popup/Options에서 메시지 전송
   *
   * @param type - 메시지 타입
   * @param request - 메시지 요청 페이로드
   * @returns 메시지 응답 페이로드
   */
  public async send<T extends MessageType>(
    type: T,
    request: MessageRequest<T>
  ): Promise<MessageResponse<T>> {
    try {
      const message = { type, ...request } as any;
      const response = await browser.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.error(`[MessageBus] Send error (${type}):`, error);
      throw error;
    }
  }
}
