/**
 * Simplified Plugin Types
 *
 * 핵심 원칙:
 * 1. 중복 제거 - Plugin 하나로 통합
 * 2. 간결성 - 필요한 필드만
 * 3. 타입 안전성 유지
 */

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

/**
 * 플러그인 정의
 * 메타데이터 + 실행 로직 + 설정 스키마 통합
 */
export interface Plugin {
  // === 메타데이터 ===
  id: string;
  name: string;
  description: string;
  category: 'inspector' | 'performance' | 'design' | 'utility';
  version: string;
  tier: 'free' | 'pro';

  // 아이콘 렌더링 함수
  icon: (container: HTMLDivElement) => void;

  // === 실행 로직 ===
  // URL 매칭 패턴 (기본값: ['<all_urls>'])
  matches?: string[];

  // 실행 시점 (기본값: 'document_idle')
  runAt?: 'document_start' | 'document_end' | 'document_idle';

  // 활성화 시 호출
  onActivate?: (ctx: ContentScriptContext) => void | Promise<void>;

  // 정리 로직
  onCleanup?: () => void | Promise<void>;

  // === 설정 스키마 ===
  settings?: {
    [settingId: string]: PluginSetting;
  };

  // === 단축키 ===
  shortcuts?: {
    [shortcutId: string]: PluginShortcut;
  };
}

/**
 * 플러그인 설정 스키마
 */
export interface PluginSetting {
  type: 'boolean' | 'string' | 'number' | 'select';
  label: string;
  description?: string;
  defaultValue: any;
  options?: Array<{ label: string; value: any }>;
}

/**
 * 플러그인 단축키
 */
export interface PluginShortcut {
  name: string;
  description: string;
  keys: ShortcutKey[]; // ['Cmd', 'Shift', 'P']
  handler: (event: KeyboardEvent, ctx: ContentScriptContext) => void | Promise<void>;
}

/**
 * 단축키 키 타입
 */
export type ShortcutKey =
  | 'Cmd'    // Mac: Command, Windows: Ctrl
  | 'Shift'
  | 'Alt'
  | 'Ctrl'
  | string;  // 일반 키 (A-Z, 0-9, F1-F12 등)

/**
 * 저장된 플러그인 상태
 * (StorageManager에서 관리)
 */
export interface PluginState {
  enabled: boolean;
  settings: Record<string, any>; // 설정값들
  shortcuts: Record<string, ShortcutState>; // 단축키 상태
}

/**
 * 단축키 상태
 */
export interface ShortcutState {
  enabled: boolean;
  keys?: ShortcutKey[]; // 사용자 커스텀 단축키
}

/**
 * 전체 앱 상태
 */
export interface AppState {
  plugins: Record<string, PluginState>;
}
