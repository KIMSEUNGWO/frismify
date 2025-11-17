/**
 * 단축키 유틸리티
 * 추상화된 단축키 정의를 플랫폼별로 변환
 */

import { platform } from './platform';

/**
 * 단축키 키 타입
 */
export type ShortcutKey =
  | 'Cmd'      // Command (Mac) / Ctrl (Windows)
  | 'Shift'    // Shift
  | 'Alt'      // Alt (Windows) / Option (Mac)
  | 'Ctrl'     // Control (Mac/Windows)
  | string;    // 일반 키 (A-Z, 0-9, F1-F12, etc)

/**
 * Mac 단축키 심볼 매핑
 */
const MAC_SYMBOLS: Record<string, string> = {
  Cmd: '⌘',
  Shift: '⇧',
  Alt: '⌥',
  Ctrl: '⌃',
};

/**
 * Windows/Linux 단축키 텍스트 매핑
 */
const WIN_TEXTS: Record<string, string> = {
  Cmd: 'Ctrl',
  Shift: 'Shift',
  Alt: 'Alt',
  Ctrl: 'Ctrl',
};

/**
 * Mac 단축키 텍스트 매핑 (Chrome Commands API용)
 */
const MAC_TEXTS: Record<string, string> = {
  Cmd: 'Command',
  Shift: 'Shift',
  Alt: 'Alt',
  Ctrl: 'MacCtrl',
};

/**
 * 추상화된 단축키를 Mac 형식으로 변환
 * @example ['Cmd', 'Shift', 'P'] -> '⌘⇧P'
 */
export function toMacShortcut(keys: ShortcutKey[]): string {
  return keys.map(key => MAC_SYMBOLS[key] || key.toUpperCase()).join('');
}

/**
 * 추상화된 단축키를 Windows 형식으로 변환
 * @example ['Cmd', 'Shift', 'P'] -> 'Ctrl+Shift+P'
 */
export function toWindowsShortcut(keys: ShortcutKey[]): string {
  return keys.map(key => WIN_TEXTS[key] || key).join('+');
}

/**
 * 추상화된 단축키를 Mac 텍스트 형식으로 변환 (Chrome Commands API용)
 * @example ['Cmd', 'Shift', 'P'] -> 'Command+Shift+P'
 */
export function toMacShortcutText(keys: ShortcutKey[]): string {
  return keys.map(key => MAC_TEXTS[key] || key).join('+');
}

/**
 * 추상화된 단축키를 현재 플랫폼에 맞게 변환
 */
export function toPlatformShortcut(keys: ShortcutKey[]): string {
  return platform.isMac ? toMacShortcut(keys) : toWindowsShortcut(keys);
}

/**
 * Mac 플랫폼 여부 확인 (하위 호환성)
 */
export function isMacPlatform(): boolean {
  return platform.isMac;
}

/**
 * 추상화된 단축키를 표시용 문자열로 변환 (예쁘게)
 * Mac: ⌘⇧P
 * Windows: Ctrl + Shift + P
 */
export function formatShortcutForDisplay(keys: ShortcutKey[]): string {
  if (platform.isMac) {
    return toMacShortcut(keys);
  } else {
    // Windows에서는 + 사이에 공백 추가
    return toWindowsShortcut(keys).replace(/\+/g, ' + ');
  }
}

/**
 * Chrome Commands API용 단축키 객체 생성
 */
export function toCommandShortcut(keys: ShortcutKey[]): {
  windows: string;
  mac: string;
} {
  return {
    windows: toWindowsShortcut(keys),
    mac: toMacShortcutText(keys),  // 심볼이 아닌 텍스트 사용
  };
}

/**
 * KeyboardEvent가 단축키와 일치하는지 확인
 */
export function matchesShortcut(event: KeyboardEvent, keys: ShortcutKey[]): boolean {
  // 수정자 키 상태 확인
  const hasCmd = keys.includes('Cmd');
  const hasShift = keys.includes('Shift');
  const hasAlt = keys.includes('Alt');
  const hasCtrl = keys.includes('Ctrl');

  // Mac에서 Cmd는 metaKey, Windows에서는 ctrlKey
  const cmdMatches = platform.isMac
    ? event.metaKey === hasCmd
    : event.ctrlKey === hasCmd;

  const shiftMatches = event.shiftKey === hasShift;
  const altMatches = event.altKey === hasAlt;
  const ctrlMatches = event.ctrlKey === hasCtrl;

  // 일반 키 추출 (수정자가 아닌 키)
  const normalKey = keys.find(
    key => !['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
  );

  if (!normalKey) {
    return false;
  }

  const keyMatches = event.key.toUpperCase() === normalKey.toUpperCase();

  return cmdMatches && shiftMatches && altMatches && ctrlMatches && keyMatches;
}

/**
 * 단축키 유효성 검사
 */
export function isValidShortcut(keys: ShortcutKey[]): boolean {
  if (keys.length === 0) {
    return false;
  }

  // 최소 하나의 수정자 키가 있어야 함
  const hasModifier = keys.some(key =>
    ['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
  );

  // 일반 키가 정확히 하나 있어야 함
  const normalKeys = keys.filter(
    key => !['Cmd', 'Shift', 'Alt', 'Ctrl'].includes(key)
  );

  return hasModifier && normalKeys.length === 1;
}