import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { PluginSettings, PluginConfig } from '../plugins/types';
import type { AppSettings } from './settings-manager';
import {platform, Platform } from "../utils/platform";

/**
 * 깊은 읽기 전용 타입
 * 중첩된 객체도 모두 readonly로 만듭니다
 */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 플러그인 헬퍼 유틸리티
 * 플러그인 개발자에게 제공되는 편의 기능들
 */
export interface PluginHelpers {
  /** 현재 설정값 (읽기 전용) */
  readonly settings: DeepReadonly<PluginSettings>;
  readonly platform: DeepReadonly<Platform>;
  /** 전체 설정 객체 (읽기 전용) */
  readonly config: DeepReadonly<PluginConfig>;

  /** 플러그인 ID */
  pluginId: string;

  /** Content Script Context */
  ctx: ContentScriptContext;

  /** 특정 설정값 가져오기 (defaultValue 있을 때) */
  getSetting<T>(key: string, defaultValue: T): T;
  /** 특정 설정값 가져오기 (defaultValue 없을 때) */
  getSetting<T>(key: string): T | undefined;

  /** 단축키 활성화 여부 확인 */
  isShortcutEnabled(shortcutId: string): boolean;

  /** 커스텀 단축키 가져오기 (없으면 기본값) */
  getShortcutKey(shortcutId: string): { windows: string; mac: string } | null;
}

/**
 * 플러그인 실행 옵션
 */
export interface PluginExecuteOptions {
  /** 플러그인 활성화 시 실행되는 메인 로직 */
  onActivate: (helpers: PluginHelpers) => void | Promise<void>;

  /** 설정 변경 시 호출되는 콜백 (선택사항) */
  onSettingsChange?: (helpers: PluginHelpers) => void;

  /** 단축키 핸들러 맵 (선택사항) */
  shortcuts?: {
    [shortcutId: string]: (event: KeyboardEvent, helpers: PluginHelpers) => void;
  };

  /** 정리 로직 (선택사항) */
  onCleanup?: () => void;
}

/**
 * 플러그인 실행기 생성
 *
 * 이 함수는 공통적인 플러그인 실행 로직을 추상화합니다:
 * - 설정 로드
 * - 활성화 상태 체크
 * - 설정 변경 감지
 * - 단축키 핸들러 등록
 *
 * 플러그인 개발자는 비즈니스 로직만 작성하면 됩니다.
 *
 * @example
 * ```typescript
 * execute: createPluginExecutor('css-spy', {
 *   onActivate: (helpers) => {
 *     console.log('Activated with settings:', helpers.settings);
 *   },
 *   onSettingsChange: (helpers) => {
 *     console.log('Settings changed:', helpers.settings);
 *   },
 *   shortcuts: {
 *     'toggle-inspector': (e, helpers) => {
 *       console.log('Toggle shortcut pressed');
 *     }
 *   }
 * })
 * ```
 */
export function createPluginExecutor(
  pluginId: string,
  options: PluginExecuteOptions
) {
  return async (ctx: ContentScriptContext) => {
    // 1. 설정 매니저 동적 import
    const { settingsManager } = await import('./settings-manager');

    // 2. 설정 로드
    const config = settingsManager.getPluginConfig(pluginId);

    // 3. 활성화 상태 체크
    if (!config?.enabled) {
      console.log(`[${pluginId}] Plugin is disabled`);
      return;
    }

    const settings = config.settings || {};

    // 4. 헬퍼 객체 생성
    const createHelpers = (currentSettings?: PluginSettings): PluginHelpers => ({
      settings: currentSettings || settings,
      platform: platform,
      config,
      pluginId,
      ctx,

      getSetting(key: string, defaultValue?: any): any {
        const value = (currentSettings || settings)[key];
        return value !== undefined ? value : defaultValue;
      },

      isShortcutEnabled(shortcutId: string): boolean {
        return config.shortcuts?.[shortcutId]?.enabled ?? true;
      },

      getShortcutKey(shortcutId: string) {
        return config.shortcuts?.[shortcutId]?.customKey || null;
      },
    });

    const helpers = createHelpers();

    // 5. 메인 로직 실행
    try {
      await options.onActivate(helpers);
      console.log(`[${pluginId}] Plugin activated successfully`);
    } catch (error) {
      console.error(`[${pluginId}] Error during activation:`, error);
      return;
    }

    // 6. 설정 변경 감지 리스너 등록 (옵션)
    if (options.onSettingsChange) {
      const changeHandler = (appSettings: AppSettings) => {
        const newConfig = appSettings.plugins[pluginId];
        if (newConfig) {
          const newHelpers = createHelpers(newConfig.settings);
          try {
            options.onSettingsChange!(newHelpers);
          } catch (error) {
            console.error(`[${pluginId}] Error during settings change:`, error);
          }
        }
      };

      settingsManager.addChangeListener(changeHandler);

      // cleanup 시 리스너 제거
      const originalCleanup = options.onCleanup;
      options.onCleanup = () => {
        settingsManager.removeChangeListener(changeHandler);
        originalCleanup?.();
      };
    }

    // 7. 단축키 핸들러 등록 (옵션)
    if (options.shortcuts) {
      const shortcutHandler = (e: KeyboardEvent) => {
        Object.entries(options.shortcuts!).forEach(([shortcutId, handler]) => {
          // 단축키가 비활성화되어 있으면 스킵
          if (!helpers.isShortcutEnabled(shortcutId)) {
            return;
          }

          // 커스텀 단축키 또는 기본 단축키 가져오기
          const customKey = helpers.getShortcutKey(shortcutId);

          // TODO: 실제 키 조합과 비교
          // 현재는 단순히 핸들러를 호출
          // 실제로는 e.key, e.ctrlKey 등과 비교해야 함

          try {
            handler(e, helpers);
          } catch (error) {
            console.error(`[${pluginId}] Error in shortcut handler (${shortcutId}):`, error);
          }
        });
      };

      document.addEventListener('keydown', shortcutHandler);

      // cleanup 시 리스너 제거
      const originalCleanup = options.onCleanup;
      options.onCleanup = () => {
        document.removeEventListener('keydown', shortcutHandler);
        originalCleanup?.();
      };
    }
  };
}