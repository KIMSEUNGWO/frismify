/**
 * Command 실행 컨텍스트
 *
 * Command가 실행될 때 필요한 모든 의존성을 제공합니다.
 * Dependency Injection 패턴을 사용하여 결합도를 낮춥니다.
 */

import type { PluginManager } from '@/core/PluginManager';
import type { PluginRegistry } from '@/core/PluginRegistry';
import type { StorageManager } from '@/core/StorageManager';
import type { BackgroundFetchService } from '@/core/BackgroundFetchService';

/**
 * CommandContext 인터페이스
 *
 * Background에서 CommandRegistry.execute() 호출 시 전달됩니다.
 *
 * @example
 * const context: CommandContext = {
 *   pluginManager: PluginManager.getInstance(),
 *   pluginRegistry: PluginRegistry.getInstance(),
 *   storageManager: StorageManager.getInstance(),
 *   backgroundFetchService: BackgroundFetchService.getInstance(),
 * };
 *
 * await commandRegistry.execute(MessageType.TOGGLE_PLUGIN, request, context);
 */
export interface CommandContext {
  /**
   * 플러그인 상태 관리
   */
  pluginManager: PluginManager;

  /**
   * 플러그인 메타데이터 레지스트리
   */
  pluginRegistry: PluginRegistry;

  /**
   * 스토리지 관리
   */
  storageManager: StorageManager;

  /**
   * Background Fetch 서비스 (HLS Downloader용)
   */
  backgroundFetchService: BackgroundFetchService;

  /**
   * 메시지 발신자 정보 (선택사항)
   */
  sender?: any; // browser.runtime.MessageSender;
}
