/**
 * Command Pattern 인터페이스
 *
 * 각 메시지 타입별로 Command 클래스를 구현하여
 * Background의 거대한 switch문을 제거합니다.
 */

import type { MessageType } from '@/core/InstanceManager';
import type { MessageRequest, MessageResponse } from '@/core/types/messages';
import type { CommandContext } from './CommandContext';

/**
 * Command 인터페이스
 *
 * @template T - MessageType (메시지 타입)
 *
 * @example
 * class TogglePluginCommand implements Command<MessageType.TOGGLE_PLUGIN> {
 *   readonly type = MessageType.TOGGLE_PLUGIN;
 *
 *   async execute(request: { pluginId: string }, context: CommandContext) {
 *     await context.pluginManager.togglePlugin(request.pluginId);
 *     return { success: true };
 *   }
 * }
 */
export interface Command<T extends MessageType = MessageType> {
  /**
   * 메시지 타입 (CommandRegistry에서 라우팅에 사용)
   */
  readonly type: T;

  /**
   * Command 실행
   *
   * @param request - 메시지 요청 페이로드
   * @param context - Command 실행 컨텍스트 (PluginManager, PluginRegistry 등)
   * @returns 메시지 응답 페이로드
   */
  execute(
    request: MessageRequest<T>,
    context: CommandContext
  ): Promise<MessageResponse<T>>;

  /**
   * 요청 검증 (선택사항)
   *
   * @param request - 메시지 요청 페이로드
   * @returns 검증 결과 (true면 통과, string이면 에러 메시지)
   */
  validate?(request: MessageRequest<T>): boolean | string;
}
