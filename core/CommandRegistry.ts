/**
 * CommandRegistry - Command Pattern 구현
 *
 * 각 메시지 타입별 Command를 등록하고 실행합니다.
 * Background의 거대한 switch문을 대체합니다.
 */

import type { MessageType } from '@/core/InstanceManager';
import type { Command } from './commands/Command';
import type { CommandContext } from './commands/CommandContext';
import type { MessageRequest, MessageResponse } from './types/messages';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<MessageType, Command> = new Map();

  private constructor() {}

  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }

  /**
   * Command 등록
   *
   * @param command - 등록할 Command 인스턴스
   */
  public register(command: Command): void {
    if (this.commands.has(command.type)) {
      console.warn(`[CommandRegistry] Command for ${command.type} already registered. Overwriting.`);
    }
    this.commands.set(command.type, command);
    console.log(`[CommandRegistry] Command registered: ${command.type}`);
  }

  /**
   * 여러 Command를 한번에 등록
   *
   * @param commands - 등록할 Command 인스턴스 배열
   */
  public registerAll(commands: Command[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Command 실행
   *
   * @param type - 메시지 타입
   * @param request - 메시지 요청 페이로드
   * @param context - Command 실행 컨텍스트
   * @returns 메시지 응답 페이로드
   * @throws {Error} Command가 등록되지 않은 경우
   */
  public async execute<T extends MessageType>(
    type: T,
    request: MessageRequest<T>,
    context: CommandContext
  ): Promise<MessageResponse<T>> {
    const command = this.commands.get(type);

    if (!command) {
      console.error(`[CommandRegistry] No command registered for ${type}`);
      throw new Error(`No handler for message type: ${type}`);
    }

    // 검증 (선택사항)
    if (command.validate) {
      const validation = command.validate(request);
      if (validation !== true) {
        const errorMsg = typeof validation === 'string' ? validation : 'Validation failed';
        throw new Error(`Command validation failed: ${errorMsg}`);
      }
    }

    try {
      console.log(`[CommandRegistry] Executing command: ${type}`);
      const response = await command.execute(request, context);
      return response;
    } catch (error) {
      console.error(`[CommandRegistry] Command execution failed (${type}):`, error);
      throw error;
    }
  }

  /**
   * Command 존재 여부 확인
   *
   * @param type - 메시지 타입
   * @returns 존재 여부
   */
  public has(type: MessageType): boolean {
    return this.commands.has(type);
  }

  /**
   * 등록된 Command 개수
   *
   * @returns Command 개수
   */
  public getCount(): number {
    return this.commands.size;
  }
}
