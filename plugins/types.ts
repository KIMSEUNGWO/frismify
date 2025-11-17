import type { ContentScriptContext} from "wxt/utils/content-script-context";
import type { ShortcutKey } from "../utils/shortcut-utils";

/**
 * 단축키 정의
 */
export interface PluginShortcut {
    id: string; // 단축키 고유 ID (예: 'toggle-inspector')
    name: string; // 표시 이름 (예: 'Toggle CSS inspection mode')
    description: string; // 설명 (예: 'Enable or disable CSS inspection')
    key: ShortcutKey[]; // 추상화된 단축키 (예: ['Cmd', 'Shift', 'I'])
    enabled?: boolean; // 단축키 활성화 여부 (기본: true)
}

/**
 * 설정 옵션 정의
 */
export interface PluginSettingOption {
    id: string; // 설정 ID (예: 'showComputedStyles')
    name: string; // 표시 이름 (예: 'Show Computed Styles')
    description: string; // 설명
    type: 'boolean' | 'string' | 'number' | 'select'; // 설정 타입
    defaultValue: any; // 기본값
    options?: Array<{ label: string; value: any }>; // select 타입일 경우 선택지
}

/**
 * 플러그인 메타데이터
 */
export interface PluginMetaData {
    id: string;
    name: string;
    description: string;
    drawIcon: (div: HTMLDivElement) => HTMLDivElement;
    category?: 'inspector' | 'performance' | 'design' | 'utility';
    version: string;
    author?: string;
    tier: 'free' | 'pro'; // 플러그인 티어

    // 여러 단축키 지원
    shortcuts?: PluginShortcut[];

    // 구조화된 설정 옵션들
    settingOptions?: PluginSettingOption[];
}

/**
 * 플러그인 설정값 (실제 저장되는 값)
 */
export interface PluginSettings {
    [key: string]: any;
}

/**
 * 플러그인 설정 (저장되는 전체 구조)
 */
export interface PluginConfig {
    enabled: boolean; // 플러그인 활성화 여부
    settings?: PluginSettings; // 설정값들
    shortcuts?: {
        [shortcutId: string]: {
            customKey?: { windows: string; mac: string }; // 사용자 정의 단축키
            enabled: boolean; // 단축키 활성화 여부
        };
    };
}

export interface Plugin {
    meta: PluginMetaData;

    // 기본 설정값
    defaultSettings?: PluginSettings;

    // Content script 실행 로직
    execute: (ctx: ContentScriptContext) => void | Promise<void>;

    // 정리 로직
    cleanup?: () => void | Promise<void>;

    // URL 패턴
    matches: string[];

    // 실행 시점
    runAt?: 'document_start' | 'document_end' | 'document_idle';
}

export interface CommandInfo {
    pluginId: string;
    name: string;
    shortcut: string;
    description: string;
}